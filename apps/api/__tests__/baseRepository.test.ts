import type { EntityDTO, UserWithAuthDTO } from "@repo/sdk/src/types";
import { EntityType, UserType } from "@repo/sdk/src/types";
import { Timestamp } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;
type Clause = [string, string, unknown];
type Order = [string, string];

const MISSING = Symbol("missing");

const DOCUMENT_ID_FIELD = "__name__";

/** Firestore's canonical value ordering: timestamps sort before strings. */
const VALUE_TYPE_RANK = {
    nullish: 0,
    boolean: 1,
    number: 2,
    instant: 3,
    string: 4,
    other: 5,
} as const;

/**
 * In-memory stand-in for the firebase-admin Firestore surface the repositories rely on.
 * `exists` is deliberately a boolean property (not a method, as in the client SDK) so any
 * leftover client-SDK dialect fails loudly instead of silently returning undefined.
 */
const { fakeDb } = vi.hoisted(() => {
    const collections = new Map<string, Map<string, Record<string, unknown>>>();
    const committedBatchSizes: number[] = [];
    const emittedQueries: {
        table: string;
        clauses: Clause[];
        orders: Order[];
        limit: number | null;
    }[] = [];
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

    /**
     * Firestore sorts by value type before value, which is why a collection holding
     * `createdAt` both as a Timestamp and as an ISO string comes back in an order that is
     * not chronological. The ranks below follow that ordering: timestamps precede strings.
     */
    const typeRank = (value: unknown) => {
        if (value === null || value === undefined) {
            return VALUE_TYPE_RANK.nullish;
        }
        if (typeof value === "boolean") {
            return VALUE_TYPE_RANK.boolean;
        }
        if (typeof value === "number") {
            return VALUE_TYPE_RANK.number;
        }
        if (instantMillis(value) !== null) {
            return VALUE_TYPE_RANK.instant;
        }
        if (typeof value === "string") {
            return VALUE_TYPE_RANK.string;
        }
        return VALUE_TYPE_RANK.other;
    };

    function instantMillis(value: unknown): number | null {
        if (value instanceof Date) {
            return value.getTime();
        }
        if (
            typeof value === "object" &&
            value !== null &&
            typeof (value as { toDate?: unknown }).toDate === "function"
        ) {
            return (value as { toDate: () => Date }).toDate().getTime();
        }
        return null;
    }

    const compareValues = (a: unknown, b: unknown) => {
        const rankDelta = typeRank(a) - typeRank(b);
        if (rankDelta !== 0) {
            return rankDelta;
        }
        const millisA = instantMillis(a);
        if (millisA !== null) {
            return millisA - (instantMillis(b) ?? 0);
        }
        if (typeof a === "number" && typeof b === "number") {
            return a - b;
        }
        if (typeof a === "string" && typeof b === "string") {
            return a.localeCompare(b);
        }
        return 0;
    };

    type Entry = { id: string; row: Record<string, unknown> };

    const orderValue = (entry: Entry, field: string) =>
        field === DOCUMENT_ID_FIELD ? entry.id : entry.row[field];

    const compareEntries = (a: Entry, b: Entry, orders: Order[]) => {
        for (const [field, direction] of orders) {
            const delta = compareValues(
                orderValue(a, field),
                orderValue(b, field)
            );
            if (delta !== 0) {
                return direction === "desc" ? -delta : delta;
            }
        }
        return 0;
    };

    type QueryState = {
        table: string;
        clauses: Clause[];
        orders: Order[];
        limit: number | null;
        after: Entry | null;
    };

    const makeQuery = (state: QueryState) => ({
        where(field: string, op: string, value: unknown) {
            return makeQuery({
                ...state,
                clauses: [...state.clauses, [field, op, value]],
            });
        },
        orderBy(field: unknown, direction = "asc") {
            const path = typeof field === "string" ? field : DOCUMENT_ID_FIELD;
            return makeQuery({
                ...state,
                orders: [...state.orders, [path, direction] as Order],
            });
        },
        limit(count: number) {
            return makeQuery({ ...state, limit: count });
        },
        startAfter(snapshot: { id: string; data: () => Row | undefined }) {
            return makeQuery({
                ...state,
                after: { id: snapshot.id, row: snapshot.data() ?? {} },
            });
        },
        count() {
            const { table: name, clauses } = state;

            return {
                get() {
                    emittedQueries.push({
                        table: name,
                        clauses,
                        orders: [],
                        limit: null,
                    });

                    const matched = [...table(name).values()].filter((row) =>
                        matches(row, clauses)
                    );

                    return Promise.resolve({
                        data: () => ({ count: matched.length }),
                    });
                },
            };
        },
        get() {
            const { table: name, clauses, orders, after } = state;
            const limitTo = state.limit;

            emittedQueries.push({
                table: name,
                clauses,
                orders,
                limit: limitTo,
            });

            let entries: Entry[] = [...table(name).entries()]
                .filter(([, row]) => matches(row, clauses))
                .map(([id, row]) => ({ id, row }));

            if (orders.length > 0) {
                entries.sort((a, b) => compareEntries(a, b, orders));
            }

            if (after) {
                entries = entries.filter(
                    (entry) => compareEntries(entry, after, orders) > 0
                );
            }

            if (limitTo !== null) {
                entries = entries.slice(0, limitTo);
            }

            const docs = entries.map(({ id, row }) => ({
                id,
                ref: { id, table: name },
                exists: true,
                data: () => ({ ...row }),
            }));

            return Promise.resolve({ docs, empty: docs.length === 0 });
        },
    });

    const db = {
        batch() {
            const removals: { id: string; table: string }[] = [];
            return {
                delete(ref: { id: string; table: string }) {
                    removals.push(ref);
                },
                commit() {
                    for (const ref of removals) {
                        table(ref.table).delete(ref.id);
                    }
                    committedBatchSizes.push(removals.length);
                    return Promise.resolve([]);
                },
            };
        },
        collection(name: string) {
            return {
                ...makeQuery({
                    table: name,
                    clauses: [],
                    orders: [],
                    limit: null,
                    after: null,
                }),
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
                        delete() {
                            table(name).delete(id);
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
        batches: committedBatchSizes,
        count(name: string) {
            return table(name).size;
        },
        reset() {
            collections.clear();
            emittedQueries.length = 0;
            committedBatchSizes.length = 0;
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

const { BaseRepository, PaginationCursorError, PurgeNotFinishedError } =
    await import("@/(shared)/repositories/base.repository");
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

/**
 * Four rows of the same owner sharing one instant — the shape the emulator seed produces,
 * and the case that repeats or skips records when the cursor has no tie-break.
 */
function seedTiedEntities() {
    for (const id of ["doc-a", "doc-b", "doc-c", "doc-d"]) {
        fakeDb.seed(
            "entity",
            id,
            entityRow({ createdAt: adminTimestamp(CREATED_AT_ISO) })
        );
    }
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
            orders: [],
            limit: null,
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

    it("leaves createdAt in the stored type instead of writing the mapped string back", async () => {
        const storedInstant = adminTimestamp(CREATED_AT_ISO);
        fakeDb.seed("entity", "e1", entityRow({ createdAt: storedInstant }));

        await repository.update({ id: "e1", name: "Renamed" });
        await repository.update({ id: "e1", name: "Renamed again" });

        expect(fakeDb.read("entity", "e1")?.createdAt).toBe(storedInstant);
    });

    it("writes only the fields it was given", async () => {
        fakeDb.seed("entity", "e1", entityRow());

        await repository.update({ id: "e1", name: "Renamed" });

        const stored = fakeDb.read("entity", "e1");
        expect(stored?.name).toBe("Renamed");
        expect(stored?.description).toBe("an entity");
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
    const firstPage = { limit: 20, cursorId: null };

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

        const page = await entityRepository.listByUserId(
            "profile-1",
            firstPage
        );

        expect(page.items.map((row) => row.id)).toEqual(["newer", "older"]);
        expect(page.nextCursorId).toBeNull();
    });

    it("pushes the soft-delete filter, the ordering and the size into the query", async () => {
        fakeDb.seed("entity", "kept", entityRow());

        await entityRepository.listByUserId("profile-1", {
            limit: 2,
            cursorId: null,
        });

        expect(fakeDb.queries.at(-1)).toEqual({
            table: "entity",
            clauses: [
                ["userId", "==", "profile-1"],
                ["deletedAt", "==", null],
            ],
            orders: [
                ["createdAt", "desc"],
                [DOCUMENT_ID_FIELD, "desc"],
            ],
            // One more than asked, which is how the page learns there is a next one
            // without counting the collection.
            limit: 3,
        });
    });

    it("hands back the requested size plus a cursor when more rows exist", async () => {
        seedTiedEntities();

        const page = await entityRepository.listByUserId("profile-1", {
            limit: 2,
            cursorId: null,
        });

        expect(page.items.map((row) => row.id)).toEqual(["doc-d", "doc-c"]);
        expect(page.nextCursorId).toBe("doc-c");
    });

    it("walks every row exactly once when createdAt is identical across the page break", async () => {
        seedTiedEntities();

        const first = await entityRepository.listByUserId("profile-1", {
            limit: 2,
            cursorId: null,
        });
        const second = await entityRepository.listByUserId("profile-1", {
            limit: 2,
            cursorId: first.nextCursorId,
        });

        expect([...first.items, ...second.items].map((row) => row.id)).toEqual([
            "doc-d",
            "doc-c",
            "doc-b",
            "doc-a",
        ]);
        expect(second.nextCursorId).toBeNull();
    });

    it("keeps anchoring on a row that was soft-deleted after the page was served", async () => {
        seedTiedEntities();
        fakeDb.seed(
            "entity",
            "doc-c",
            entityRow({
                createdAt: adminTimestamp(CREATED_AT_ISO),
                deletedAt: new Date("2024-07-01T00:00:00.000Z"),
            })
        );

        const page = await entityRepository.listByUserId("profile-1", {
            limit: 2,
            cursorId: "doc-c",
        });

        expect(page.items.map((row) => row.id)).toEqual(["doc-b", "doc-a"]);
    });

    it("refuses a cursor whose anchor is not there", async () => {
        seedTiedEntities();

        await expect(
            entityRepository.listByUserId("profile-1", {
                limit: 2,
                cursorId: "never-existed",
            })
        ).rejects.toBeInstanceOf(PaginationCursorError);
    });

    it("never returns another owner's rows when the cursor points at their document", async () => {
        seedTiedEntities();
        fakeDb.seed(
            "entity",
            "doc-intruder",
            entityRow({
                createdAt: adminTimestamp(CREATED_AT_ISO),
                userId: "profile-2",
            })
        );

        const page = await entityRepository.listByUserId("profile-1", {
            limit: 20,
            cursorId: "doc-intruder",
        });

        expect(page.items.map((row) => row.id)).toEqual([
            "doc-d",
            "doc-c",
            "doc-b",
            "doc-a",
        ]);
        expect(page.items.every((row) => row.userId === "profile-1")).toBe(
            true
        );
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
            orders: [],
            limit: null,
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

describe("UserRepository.touchLastAccess", () => {
    const ACCESS_AT_ISO = "2026-09-17T14:45:00.000Z";

    function seedProfile() {
        fakeDb.seed("user", "p1", {
            reference_id: "auth-1",
            type: UserType.COMMON,
            createdAt: Timestamp.fromDate(new Date(CREATED_AT_ISO)),
            updatedAt: Timestamp.fromDate(new Date(CREATED_AT_ISO)),
            deletedAt: null,
        });
    }

    it("writes the stamp on the profile document", async () => {
        seedProfile();

        await userRepository.touchLastAccess("p1", new Date(ACCESS_AT_ISO));

        const stored = fakeDb.read("user", "p1");
        expect((stored?.lastAccessAt as Date).toISOString()).toBe(
            ACCESS_AT_ISO
        );
    });

    /**
     * An access is not an edit of the profile: `updatedAt` has to stay on the instant of
     * the last real change, which is what the screens that show it mean by the word.
     */
    it("leaves updatedAt on the instant of the last real edit", async () => {
        seedProfile();

        await userRepository.touchLastAccess("p1", new Date(ACCESS_AT_ISO));

        const stored = fakeDb.read("user", "p1");
        expect(stored?.updatedAt).toBeInstanceOf(Timestamp);
        expect((stored?.updatedAt as Timestamp).toDate().toISOString()).toBe(
            CREATED_AT_ISO
        );
    });

    it("touches no other field of the profile", async () => {
        seedProfile();

        await userRepository.touchLastAccess("p1", new Date(ACCESS_AT_ISO));

        const stored = fakeDb.read("user", "p1");
        expect(stored?.type).toBe(UserType.COMMON);
        expect(stored?.reference_id).toBe("auth-1");
        expect(stored?.deletedAt).toBeNull();
    });
});

describe("EntityRepository.summaryByUserId", () => {
    const LIVE_OWNED_ENTITIES = 3;
    const AGGREGATIONS_PER_SUMMARY = 5;

    function seedSummaryFixture() {
        fakeDb.seed(
            "entity",
            "own-franchise",
            entityRow({ type: EntityType.FRANCHISE })
        );
        fakeDb.seed(
            "entity",
            "own-customer",
            entityRow({ type: EntityType.CUSTOMER })
        );
        fakeDb.seed(
            "entity",
            "own-collaborator-off",
            entityRow({ type: EntityType.COLLABORATOR, enabled: false })
        );
        fakeDb.seed(
            "entity",
            "own-deleted",
            entityRow({ type: EntityType.CUSTOMER, deletedAt: new Date() })
        );
        fakeDb.seed(
            "entity",
            "someone-else",
            entityRow({ userId: "profile-2", type: EntityType.CUSTOMER })
        );
    }

    it("counts only the caller's live records", async () => {
        seedSummaryFixture();

        const summary = await entityRepository.summaryByUserId("profile-1");

        expect(summary.total).toBe(LIVE_OWNED_ENTITIES);
        expect(summary.enabled).toBe(2);
        expect(summary.byType).toEqual({
            franchise: 1,
            customer: 1,
            collaborator: 1,
        });
    });

    it("scopes every count by owner and soft delete", async () => {
        seedSummaryFixture();

        await entityRepository.summaryByUserId("profile-1");

        expect(fakeDb.queries).toHaveLength(AGGREGATIONS_PER_SUMMARY);
        for (const query of fakeDb.queries) {
            expect(query.table).toBe("entity");
            expect(query.clauses).toEqual(
                expect.arrayContaining([
                    ["userId", "==", "profile-1"],
                    ["deletedAt", "==", null],
                ])
            );
        }
    });

    it("takes the total from its own count, not from the sum of the types", async () => {
        fakeDb.seed(
            "entity",
            "typed",
            entityRow({ type: EntityType.CUSTOMER })
        );
        // Written outside the API, so it carries no `type` and falls out of all three
        // per-type counts. The total is what must not lose it.
        fakeDb.seed("entity", "untyped", {
            userId: "profile-1",
            name: "No type",
            enabled: true,
            createdAt: new Date(CREATED_AT_ISO),
            updatedAt: new Date(CREATED_AT_ISO),
            deletedAt: null,
        });

        const summary = await entityRepository.summaryByUserId("profile-1");

        expect(summary.total).toBe(2);
        expect(
            summary.byType.franchise +
                summary.byType.customer +
                summary.byType.collaborator
        ).toBe(1);
    });

    it("never reads the documents it is counting", async () => {
        seedSummaryFixture();

        await entityRepository.summaryByUserId("profile-1");

        expect(fakeDb.queries.every((query) => query.limit === null)).toBe(
            true
        );
        expect(fakeDb.queries.every((query) => query.orders.length === 0)).toBe(
            true
        );
    });
});

describe("UserRepository.summary", () => {
    const LIVE_PROFILES = 3;

    function profileRow(overrides: Row = {}): Row {
        return {
            reference_id: "auth-1",
            type: UserType.COMMON,
            createdAt: new Date(CREATED_AT_ISO),
            updatedAt: new Date(CREATED_AT_ISO),
            deletedAt: null,
            ...overrides,
        };
    }

    it("counts live profiles by type", async () => {
        fakeDb.seed("user", "p1", profileRow({ type: UserType.ADMIN }));
        fakeDb.seed("user", "p2", profileRow());
        fakeDb.seed("user", "p3", profileRow());
        fakeDb.seed("user", "p4", profileRow({ deletedAt: new Date() }));

        const summary = await userRepository.summary();

        expect(summary.total).toBe(LIVE_PROFILES);
        expect(summary.byType).toEqual({ admin: 1, common: 2 });
    });

    it("counts a profile whose Firebase Auth account is gone, unlike the listing", async () => {
        fakeDb.seed("user", "p1", profileRow());
        getUserMock.mockRejectedValue(
            Object.assign(new Error("no such user"), {
                code: "auth/user-not-found",
            })
        );

        await expect(userRepository.list()).resolves.toHaveLength(0);
        await expect(userRepository.summary()).resolves.toMatchObject({
            total: 1,
        });
    });
});

/** Exposes the protected sweep so the bounded loop can be exercised directly. */
class PurgeableRepository extends BaseRepository<EntityDTO> {
    purgeEverything(): Promise<number> {
        return this.purgeAll(
            this.db.collection(this.table) as unknown as Parameters<
                PurgeableRepository["purgeAll"]
            >[0]
        );
    }
}

/**
 * A collection whose batch deletes never take effect, so every pass reads a full page
 * again. It is the shape of a sweep that would spin forever without a pass ceiling.
 */
function undrainableDb() {
    const PAGE = 500;
    const state = { committedBatches: 0 };

    const page = Array.from({ length: PAGE }, (_, index) => ({
        id: `stuck-${index}`,
        ref: { id: `stuck-${index}` },
        exists: true,
        data: () => ({}),
    }));

    const query = {
        where: () => query,
        orderBy: () => query,
        startAfter: () => query,
        limit: () => query,
        get: () => Promise.resolve({ docs: page, empty: false }),
    };

    const db = {
        collection: () => query,
        batch: () => ({
            delete: () => {
                // Nothing leaves the collection, on purpose.
            },
            commit: () => {
                state.committedBatches += 1;
                return Promise.resolve([]);
            },
        }),
    };

    return {
        db,
        get committedBatches() {
            return state.committedBatches;
        },
    };
}

describe("purge vs. delete", () => {
    const BATCH_LIMIT = 500;

    it("keeps `delete` a soft delete, stamping instead of removing", async () => {
        fakeDb.seed("entity", "e1", entityRow());

        await repository.delete("e1");

        expect(fakeDb.read("entity", "e1")).toBeDefined();
        expect(fakeDb.read("entity", "e1")?.deletedAt).toBeInstanceOf(Date);
    });

    it("removes the profile document for good", async () => {
        fakeDb.seed("user", "p1", {
            reference_id: "auth-1",
            type: UserType.COMMON,
            phone: "+55 51 99999-0000",
            lastAccessAt: new Date(CREATED_AT_ISO),
            deletedAt: null,
        });

        await userRepository.purgeProfile("p1");

        expect(fakeDb.read("user", "p1")).toBeUndefined();
    });

    it("erases the owner's records, soft-deleted ones included", async () => {
        fakeDb.seed("entity", "e1", entityRow());
        fakeDb.seed(
            "entity",
            "e2",
            entityRow({ deletedAt: new Date("2024-04-01T00:00:00.000Z") })
        );
        fakeDb.seed("entity", "e3", entityRow({ userId: "profile-2" }));

        const removed = await entityRepository.purgeAllByUserId("profile-1");

        expect(removed).toBe(2);
        expect(fakeDb.read("entity", "e1")).toBeUndefined();
        expect(fakeDb.read("entity", "e2")).toBeUndefined();
        expect(fakeDb.read("entity", "e3")).toBeDefined();
    });

    it("drains the collection in batches of 500", async () => {
        for (let index = 0; index < BATCH_LIMIT + 1; index++) {
            fakeDb.seed("entity", `e${index}`, entityRow());
        }

        const removed = await entityRepository.purgeAllByUserId("profile-1");

        expect(removed).toBe(BATCH_LIMIT + 1);
        expect(fakeDb.batches).toEqual([BATCH_LIMIT, 1]);
        expect(fakeDb.count("entity")).toBe(0);
    });

    it("never orders the erasure query, so it needs no composite index", async () => {
        fakeDb.seed("entity", "e1", entityRow());

        await entityRepository.purgeAllByUserId("profile-1");

        for (const query of fakeDb.queries.filter(
            (emitted) => emitted.table === "entity"
        )) {
            expect(query.orders).toEqual([]);
        }
    });

    it("stops and reports instead of looping when the query never drains", async () => {
        const MAX_PASSES = 100;
        const undrainable = undrainableDb();
        const repositoryOverUndrainable = new PurgeableRepository(
            undrainable.db as never,
            "entity"
        );

        await expect(
            repositoryOverUndrainable.purgeEverything()
        ).rejects.toBeInstanceOf(PurgeNotFinishedError);
        expect(undrainable.committedBatches).toBe(MAX_PASSES);
    });
});

describe("EntityRepository.findAllByUserId", () => {
    it("reads every record of the owner, soft-deleted ones included", async () => {
        fakeDb.seed("entity", "e1", entityRow());
        fakeDb.seed(
            "entity",
            "e2",
            entityRow({ deletedAt: new Date("2024-04-01T00:00:00.000Z") })
        );
        fakeDb.seed("entity", "e3", entityRow({ userId: "profile-2" }));

        const page = await entityRepository.findAllByUserId("profile-1", 10);

        expect(page.items.map((item) => item.id).sort()).toEqual(["e1", "e2"]);
        expect(page.truncated).toBe(false);
    });

    it("reports truncation instead of silently dropping records", async () => {
        fakeDb.seed("entity", "e1", entityRow());
        fakeDb.seed("entity", "e2", entityRow());

        const page = await entityRepository.findAllByUserId("profile-1", 1);

        expect(page.items).toHaveLength(1);
        expect(page.truncated).toBe(true);
    });
});
