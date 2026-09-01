import type { EntityDTO, UserWithAuthDTO } from "@repo/sdk/src/types";
import { EntityType, UserType } from "@repo/sdk/src/types";
import { Timestamp } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;
type Clause = [string, string, unknown];

const MISSING = Symbol("missing");

/**
 * In-memory stand-in for the firebase-admin Firestore surface the repositories rely on.
 * `exists` is deliberately a boolean property (not a method, as in the client SDK) so any
 * leftover client-SDK dialect fails loudly instead of silently returning undefined.
 */
const { fakeDb } = vi.hoisted(() => {
    const collections = new Map<string, Map<string, Record<string, unknown>>>();
    const emittedQueries: { table: string; clauses: Clause[] }[] = [];
    let autoId = 0;

    const table = (name: string) => {
        const existing = collections.get(name);
        if (existing) {
            return existing;
        }
        const created = new Map<string, Record<string, unknown>>();
        collections.set(name, created);
        return created;
    };

    const matches = (row: Record<string, unknown>, clauses: Clause[]) =>
        clauses.every(([field, op, value]) => {
            if (op !== "==") {
                throw new Error(`Unsupported query operator: ${op}`);
            }
            // Firestore does not return documents missing the compared field, not even for null.
            const actual = field in row ? row[field] : MISSING;
            return actual === value;
        });

    const makeQuery = (name: string, clauses: Clause[]) => ({
        where(field: string, op: string, value: unknown) {
            return makeQuery(name, [...clauses, [field, op, value]]);
        },
        get() {
            emittedQueries.push({ table: name, clauses });
            const docs = [...table(name).entries()]
                .filter(([, row]) => matches(row, clauses))
                .map(([id, row]) => ({
                    id,
                    exists: true,
                    data: () => ({ ...row }),
                }));
            return Promise.resolve({ docs, empty: docs.length === 0 });
        },
    });

    const db = {
        collection(name: string) {
            return {
                ...makeQuery(name, []),
                doc(id: string) {
                    return {
                        id,
                        get() {
                            const row = table(name).get(id);
                            return Promise.resolve({
                                id,
                                exists: row !== undefined,
                                data: () => (row ? { ...row } : undefined),
                            });
                        },
                        update(patch: Row) {
                            const row = table(name).get(id);
                            if (!row) {
                                return Promise.reject(
                                    new Error(`No document to update: ${id}`)
                                );
                            }
                            table(name).set(id, { ...row, ...patch });
                            return Promise.resolve({});
                        },
                    };
                },
                add(data: Row) {
                    autoId += 1;
                    const id = `doc-${autoId}`;
                    table(name).set(id, { ...data });
                    return Promise.resolve({ id });
                },
            };
        },
        seed(name: string, id: string, row: Row) {
            table(name).set(id, row);
        },
        read(name: string, id: string) {
            return table(name).get(id);
        },
        queries: emittedQueries,
        reset() {
            collections.clear();
            emittedQueries.length = 0;
            autoId = 0;
        },
    };

    return { fakeDb: db };
});

const { getUserMock } = vi.hoisted(() => ({ getUserMock: vi.fn() }));

vi.mock("@/(shared)/infra/database", () => ({ default: fakeDb }));
vi.mock("@repo/auth/server", () => ({
    getAuthInstance: () => ({ getUser: getUserMock }),
    getCurrentUser: vi.fn(),
}));

const { BaseRepository } = await import(
    "@/(shared)/repositories/base.repository"
);
const { entityMapper } = await import("@/(shared)/mappers/entity.mapper");
const { entityRepository } = await import(
    "@/(shared)/repositories/entity.repository"
);
const { userRepository } = await import(
    "@/(shared)/repositories/user.repository"
);

const repository = new BaseRepository<EntityDTO>(
    fakeDb as never,
    "entity",
    entityMapper
);

const CREATED_AT_ISO = "2024-03-01T10:00:00.000Z";

function entityRow(overrides: Row = {}): Row {
    return {
        userId: "profile-1",
        name: "Acme",
        description: "an entity",
        type: EntityType.CUSTOMER,
        enabled: true,
        createdAt: new Date(CREATED_AT_ISO),
        updatedAt: new Date(CREATED_AT_ISO),
        deletedAt: null,
        ...overrides,
    };
}

/** Stand-in for a firebase-admin Timestamp: only `toDate()` is relied upon. */
function adminTimestamp(iso: string) {
    return { toDate: () => new Date(iso) };
}

function authRecord(uid: string) {
    return {
        uid,
        email: `${uid}@example.com`,
        emailVerified: true,
        displayName: null,
        photoURL: null,
        phoneNumber: null,
        disabled: false,
        metadata: {
            creationTime: "Mon, 01 Jan 2024 00:00:00 GMT",
            lastSignInTime: null,
            lastRefreshTime: null,
        },
        providerData: [],
        customClaims: null,
        tokensValidAfterTime: undefined,
    };
}

beforeEach(() => {
    fakeDb.reset();
    getUserMock.mockReset();
    getUserMock.mockImplementation((uid: string) =>
        Promise.resolve(authRecord(uid))
    );
});

describe("BaseRepository.findById", () => {
    it("returns null for a document that does not exist", async () => {
        await expect(repository.findById("ghost")).resolves.toBeNull();
    });

    it("returns null for a soft-deleted document", async () => {
        fakeDb.seed(
            "entity",
            "e1",
            entityRow({ deletedAt: new Date("2024-04-01T00:00:00.000Z") })
        );

        await expect(repository.findById("e1")).resolves.toBeNull();
    });

    it("normalizes a Timestamp-shaped createdAt to an ISO string", async () => {
        fakeDb.seed(
            "entity",
            "e1",
            entityRow({
                createdAt: adminTimestamp(CREATED_AT_ISO),
                updatedAt: adminTimestamp(CREATED_AT_ISO),
            })
        );

        const found = await repository.findById("e1");

        expect(found?.createdAt).toBe(CREATED_AT_ISO);
        expect(found?.updatedAt).toBe(CREATED_AT_ISO);
    });

    it("keeps an already-ISO createdAt untouched", async () => {
        fakeDb.seed(
            "entity",
            "e1",
            entityRow({ createdAt: CREATED_AT_ISO, updatedAt: CREATED_AT_ISO })
        );

        const found = await repository.findById("e1");

        expect(found?.createdAt).toBe(CREATED_AT_ISO);
        expect(found?.id).toBe("e1");
    });
});

describe("BaseRepository.findAll", () => {
    it("queries only documents whose deletedAt is null", async () => {
        fakeDb.seed("entity", "kept", entityRow());
        fakeDb.seed(
            "entity",
            "gone",
            entityRow({ deletedAt: new Date("2024-04-01T00:00:00.000Z") })
        );

        const rows = await repository.findAll();

        expect(rows.map((row) => row.id)).toEqual(["kept"]);
        expect(fakeDb.queries.at(-1)).toEqual({
            table: "entity",
            clauses: [["deletedAt", "==", null]],
        });
    });

    it("applies the row mapper, like findById does", async () => {
        fakeDb.seed(
            "entity",
            "kept",
            entityRow({ createdAt: adminTimestamp(CREATED_AT_ISO) })
        );

        const [row] = await repository.findAll();

        expect(row.createdAt).toBe(CREATED_AT_ISO);
    });

    it("falls back to the raw row when the repository has no mapper", async () => {
        const unmapped = new BaseRepository<EntityDTO>(
            fakeDb as never,
            "entity"
        );
        fakeDb.seed("entity", "kept", entityRow({ createdAt: CREATED_AT_ISO }));

        const [row] = await unmapped.findAll();

        expect(row).toMatchObject({ id: "kept", createdAt: CREATED_AT_ISO });
    });
});

describe("BaseRepository.create", () => {
    it("stamps the timestamps, clears deletedAt and returns a mapped DTO", async () => {
        const created = await repository.create({
            userId: "profile-1",
            name: "Acme",
            description: "an entity",
            type: EntityType.CUSTOMER,
            photo: null,
            genre: null,
            birthdate: null,
            enabled: true,
        });

        expect(created.id).toBe("doc-1");
        expect(created.deletedAt).toBeNull();
        expect(new Date(created.createdAt).getTime()).not.toBeNaN();
        expect(created.updatedAt).toBe(created.createdAt);

        const stored = fakeDb.read("entity", "doc-1");
        expect(stored?.deletedAt).toBeNull();
        expect(stored?.createdAt).toBeInstanceOf(Date);
    });
});

describe("BaseRepository.update and delete", () => {
    it("returns the id and refreshes updatedAt", async () => {
        fakeDb.seed("entity", "e1", entityRow());

        const id = await repository.update({ id: "e1", name: "Renamed" });

        expect(id).toBe("e1");
        const stored = fakeDb.read("entity", "e1");
        expect(stored?.name).toBe("Renamed");
        expect(stored?.updatedAt).toBeInstanceOf(Date);
    });

    it("rewrites the whole document, so createdAt lands back as an ISO string", async () => {
        fakeDb.seed(
            "entity",
            "e1",
            entityRow({ createdAt: adminTimestamp(CREATED_AT_ISO) })
        );

        await repository.update({ id: "e1", name: "Renamed" });

        expect(fakeDb.read("entity", "e1")?.createdAt).toBe(CREATED_AT_ISO);
    });

    it("soft-deletes instead of removing the document", async () => {
        fakeDb.seed("entity", "e1", entityRow());

        await repository.delete("e1");

        const stored = fakeDb.read("entity", "e1");
        expect(stored).toBeDefined();
        expect(stored?.deletedAt).toBeInstanceOf(Date);
        await expect(repository.findById("e1")).resolves.toBeNull();
    });
});

describe("EntityRepository.listByUserId", () => {
    it("scopes by userId, drops soft-deleted rows and sorts by createdAt desc", async () => {
        fakeDb.seed(
            "entity",
            "older",
            entityRow({ createdAt: adminTimestamp("2024-01-01T00:00:00.000Z") })
        );
        fakeDb.seed(
            "entity",
            "newer",
            entityRow({ createdAt: adminTimestamp("2024-06-01T00:00:00.000Z") })
        );
        fakeDb.seed(
            "entity",
            "removed",
            entityRow({ deletedAt: new Date("2024-07-01T00:00:00.000Z") })
        );
        fakeDb.seed(
            "entity",
            "other-owner",
            entityRow({ userId: "profile-2" })
        );

        const rows = await entityRepository.listByUserId("profile-1");

        expect(rows.map((row) => row.id)).toEqual(["newer", "older"]);
        expect(fakeDb.queries.at(-1)).toEqual({
            table: "entity",
            clauses: [["userId", "==", "profile-1"]],
        });
    });
});

describe("UserRepository.findByReferenceId", () => {
    it("emits both equality filters and returns the profile", async () => {
        fakeDb.seed("user", "p1", {
            reference_id: "auth-uid-1",
            type: "common",
            deletedAt: null,
        });

        const profile = await userRepository.findByReferenceId("auth-uid-1");

        expect(profile?.id).toBe("p1");
        expect(fakeDb.queries.at(-1)).toEqual({
            table: "user",
            clauses: [
                ["reference_id", "==", "auth-uid-1"],
                ["deletedAt", "==", null],
            ],
        });
    });

    it("returns null when no profile matches", async () => {
        await expect(
            userRepository.findByReferenceId("auth-uid-missing")
        ).resolves.toBeNull();
    });
});

describe("UserRepository.list over the Firestore driver", () => {
    function seedProfile(id: string, referenceId: string, type: UserType) {
        fakeDb.seed("user", id, {
            reference_id: referenceId,
            type,
            createdAt: Timestamp.fromDate(new Date(CREATED_AT_ISO)),
            updatedAt: Timestamp.fromDate(new Date(CREATED_AT_ISO)),
            deletedAt: null,
        });
    }

    it("serializes the stored timestamps and merges the auth account", async () => {
        seedProfile("p1", "auth-1", UserType.COMMON);

        const [user] = (await userRepository.list()) as UserWithAuthDTO[];

        expect(user.id).toBe("p1");
        expect(user.email).toBe("auth-1@example.com");
        expect(user.createdAt).toBe(CREATED_AT_ISO);
        expect(JSON.stringify(user)).not.toContain("_seconds");
    });

    it("leaves out soft-deleted profiles", async () => {
        seedProfile("p1", "auth-1", UserType.COMMON);
        fakeDb.seed("user", "p2", {
            reference_id: "auth-2",
            type: UserType.COMMON,
            deletedAt: Timestamp.fromDate(new Date("2024-04-01T00:00:00.000Z")),
        });

        const users = await userRepository.list();

        expect(users.map((user) => user.id)).toEqual(["p1"]);
    });

    it("keeps only the requested type", async () => {
        seedProfile("p1", "auth-1", UserType.COMMON);
        seedProfile("p2", "auth-2", UserType.ADMIN);

        const users = await userRepository.list({ type: UserType.ADMIN });

        expect(users.map((user) => user.id)).toEqual(["p2"]);
        expect(getUserMock).toHaveBeenCalledTimes(1);
    });

    it("drops a profile whose auth account was deleted outside the app", async () => {
        seedProfile("p1", "auth-1", UserType.COMMON);
        seedProfile("p2", "auth-ghost", UserType.COMMON);
        getUserMock.mockImplementation((uid: string) =>
            uid === "auth-ghost"
                ? Promise.reject(
                      Object.assign(new Error("no user"), {
                          code: "auth/user-not-found",
                      })
                  )
                : Promise.resolve(authRecord(uid))
        );

        const users = await userRepository.list();

        expect(users.map((user) => user.id)).toEqual(["p1"]);
    });
});

describe("UserRepository.update and delete", () => {
    function seedProfile() {
        fakeDb.seed("user", "p1", {
            reference_id: "auth-1",
            type: UserType.COMMON,
            createdAt: Timestamp.fromDate(new Date(CREATED_AT_ISO)),
            updatedAt: Timestamp.fromDate(new Date(CREATED_AT_ISO)),
            deletedAt: null,
        });
    }

    it("keeps createdAt a Timestamp, since the repository has no mapper", async () => {
        seedProfile();

        await userRepository.update({ id: "p1", type: UserType.ADMIN });

        const stored = fakeDb.read("user", "p1");
        expect(stored?.type).toBe(UserType.ADMIN);
        expect(stored?.createdAt).toBeInstanceOf(Timestamp);
        expect(stored?.updatedAt).toBeInstanceOf(Date);
    });

    it("soft-deletes the profile instead of removing the document", async () => {
        seedProfile();

        await userRepository.delete("p1");

        expect(fakeDb.read("user", "p1")?.deletedAt).toBeInstanceOf(Date);
        await expect(userRepository.findById("p1")).resolves.toBeNull();
        await expect(
            userRepository.findByReferenceId("auth-1")
        ).resolves.toBeNull();
    });
});
