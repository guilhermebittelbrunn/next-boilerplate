import { AuditAction, AuditLevel, AuditTargetType } from "@repo/sdk/src/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;
type Clause = [string, string, unknown];

const DOCUMENT_ID_FIELD = "__name__";

/** gRPC ALREADY_EXISTS, the status Firestore answers when `create()` hits a taken id. */
const ALREADY_EXISTS_CODE = 6;

/**
 * In-memory stand-in for the slice of the firebase-admin surface this repository uses:
 * range and `array-contains` filters, the two-field ordering and `doc().create()`.
 */
const { fakeDb } = vi.hoisted(() => {
    const rows = new Map<string, Row>();
    const emitted: { clauses: Clause[]; orders: [string, string][] }[] = [];
    let autoId = 0;

    const millis = (value: unknown) =>
        value instanceof Date ? value.getTime() : Number.NaN;

    const matches = (row: Row, clauses: Clause[]) =>
        clauses.every(([field, op, value]) => {
            const actual = row[field];
            if (op === "array-contains") {
                return Array.isArray(actual) && actual.includes(value);
            }
            if (op === ">=") {
                return millis(actual) >= millis(value);
            }
            if (op === "<=") {
                return millis(actual) <= millis(value);
            }
            if (op === "==") {
                return actual === value;
            }
            throw new Error(`Unsupported query operator: ${op}`);
        });

    type Entry = { id: string; row: Row };

    const compare = (a: Entry, b: Entry, orders: [string, string][]) => {
        for (const [field, direction] of orders) {
            const left = field === DOCUMENT_ID_FIELD ? a.id : a.row[field];
            const right = field === DOCUMENT_ID_FIELD ? b.id : b.row[field];
            let delta = 0;
            if (left instanceof Date && right instanceof Date) {
                delta = left.getTime() - right.getTime();
            } else if (typeof left === "string" && typeof right === "string") {
                delta = left.localeCompare(right);
            }
            if (delta !== 0) {
                return direction === "desc" ? -delta : delta;
            }
        }
        return 0;
    };

    type State = {
        clauses: Clause[];
        orders: [string, string][];
        limit: number | null;
        after: Entry | null;
    };

    const makeQuery = (state: State) => ({
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
                orders: [
                    ...state.orders,
                    [path, direction] as [string, string],
                ],
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
        get() {
            emitted.push({ clauses: state.clauses, orders: state.orders });

            let entries: Entry[] = [...rows.entries()]
                .filter(([, row]) => matches(row, state.clauses))
                .map(([id, row]) => ({ id, row }));

            entries.sort((a, b) => compare(a, b, state.orders));

            if (state.after) {
                const anchor = state.after;
                entries = entries.filter(
                    (entry) => compare(entry, anchor, state.orders) > 0
                );
            }
            if (state.limit !== null) {
                entries = entries.slice(0, state.limit);
            }

            return Promise.resolve({
                docs: entries.map(({ id, row }) => ({
                    id,
                    exists: true,
                    data: () => ({ ...row }),
                })),
            });
        },
    });

    const db = {
        collection() {
            return {
                ...makeQuery({
                    clauses: [],
                    orders: [],
                    limit: null,
                    after: null,
                }),
                doc(id: string) {
                    return {
                        id,
                        get() {
                            const row = rows.get(id);
                            return Promise.resolve({
                                id,
                                exists: row !== undefined,
                                data: () => (row ? { ...row } : undefined),
                            });
                        },
                        create(data: Row) {
                            if (rows.has(id)) {
                                return Promise.reject(
                                    Object.assign(
                                        new Error(`Already exists: ${id}`),
                                        { code: ALREADY_EXISTS_CODE }
                                    )
                                );
                            }
                            rows.set(id, { ...data });
                            return Promise.resolve({});
                        },
                        update() {
                            throw new Error("unexpected update");
                        },
                    };
                },
                add(data: Row) {
                    autoId += 1;
                    const id = `evt-${autoId}`;
                    rows.set(id, { ...data });
                    return Promise.resolve({ id });
                },
            };
        },
        seed(id: string, row: Row) {
            rows.set(id, row);
        },
        read(id: string) {
            return rows.get(id);
        },
        queries: emitted,
        reset() {
            rows.clear();
            emitted.length = 0;
            autoId = 0;
        },
    };

    return { fakeDb: db };
});

vi.mock("@/(shared)/infra/database", () => ({ default: fakeDb }));

const { auditEventRepository, AuditEventImmutableError } = await import(
    "@/(shared)/repositories/audit-event.repository"
);

function eventData(overrides: Record<string, unknown> = {}) {
    return {
        action: AuditAction.USER_DELETE,
        level: AuditLevel.SENSITIVE,
        actorUserId: "p1",
        actorUid: "auth-1",
        actorLabel: "admin@example.com",
        onBehalfOfUserId: null,
        targetType: AuditTargetType.USER,
        targetUserId: "p2",
        targetLabel: "removed@example.com",
        changedFields: [],
        involvedUserIds: ["p1", "p2"],
        requestId: "req-1",
        windowEndsAt: null,
        ...overrides,
    };
}

function storedRow(overrides: Row = {}): Row {
    return {
        ...eventData(),
        createdAt: new Date("2026-09-16T12:00:00.000Z"),
        updatedAt: new Date("2026-09-16T12:00:00.000Z"),
        deletedAt: null,
        ...overrides,
    };
}

const firstPage = { limit: 20, cursorId: null };

beforeEach(() => {
    fakeDb.reset();
});

describe("AuditEventRepository is append-only", () => {
    it("refuses to update a recorded event", () => {
        expect(() => auditEventRepository.update()).toThrow(
            AuditEventImmutableError
        );
    });

    it("refuses a bulk update", () => {
        expect(() => auditEventRepository.updateBulk()).toThrow(
            AuditEventImmutableError
        );
    });

    it("refuses to delete a recorded event", () => {
        expect(() => auditEventRepository.delete()).toThrow(
            AuditEventImmutableError
        );
    });

    it("refuses a bulk delete", () => {
        expect(() => auditEventRepository.deleteBulk()).toThrow(
            AuditEventImmutableError
        );
    });
});

describe("AuditEventRepository.append", () => {
    it("stamps the timestamps and hands back a mapped event", async () => {
        const created = await auditEventRepository.append(eventData());

        expect(created.id).toBe("evt-1");
        expect(created.deletedAt).toBeNull();
        expect(created.action).toBe(AuditAction.USER_DELETE);
        expect(Number.isNaN(Date.parse(created.createdAt))).toBe(false);
    });

    it("persists expiresAt outside the DTO when one is given", async () => {
        const expiresAt = new Date("2027-11-26T12:00:00.000Z");

        const created = await auditEventRepository.append(
            eventData({ level: AuditLevel.INFO }),
            { expiresAt }
        );

        expect(fakeDb.read(created.id)?.expiresAt).toEqual(expiresAt);
        expect(created).not.toHaveProperty("expiresAt");
    });

    it("writes no expiresAt field when there is none", async () => {
        const created = await auditEventRepository.append(eventData(), {
            expiresAt: null,
        });

        expect(fakeDb.read(created.id)).not.toHaveProperty("expiresAt");
    });
});

describe("AuditEventRepository.appendOnce", () => {
    const key = "imp_auth-1_auth-2_1789012800000";

    it("writes under the id it was given", async () => {
        const written = await auditEventRepository.appendOnce(
            key,
            eventData({ action: AuditAction.IMPERSONATION_SESSION })
        );

        expect(written).toBe(true);
        expect(fakeDb.read(key)).toBeDefined();
    });

    it("persists expiresAt under the chosen id", async () => {
        const expiresAt = new Date("2027-11-26T12:00:00.000Z");

        await auditEventRepository.appendOnce(
            "stripe_evt_1_subscription.activate",
            eventData({ level: AuditLevel.INFO }),
            { expiresAt }
        );

        expect(
            fakeDb.read("stripe_evt_1_subscription.activate")?.expiresAt
        ).toEqual(expiresAt);
    });

    it("reports the repeat instead of writing a second document", async () => {
        await auditEventRepository.appendOnce(key, eventData());

        const written = await auditEventRepository.appendOnce(
            key,
            eventData({ actorLabel: "someone-else@example.com" })
        );

        expect(written).toBe(false);
        expect(fakeDb.read(key)?.actorLabel).toBe("admin@example.com");
    });

    it("lets a failure that is not a taken id bubble up", async () => {
        const failing = {
            collection: () => ({
                doc: () => ({
                    create: () =>
                        Promise.reject(
                            Object.assign(new Error("deadline exceeded"), {
                                code: 4,
                            })
                        ),
                }),
            }),
        };
        const repository = auditEventRepository as unknown as { db: unknown };
        const realDb = repository.db;
        repository.db = failing;

        await expect(
            auditEventRepository.appendOnce(key, eventData())
        ).rejects.toThrow("deadline exceeded");

        repository.db = realDb;
    });
});

describe("AuditEventRepository.listPage", () => {
    it("orders newest first and breaks ties by id", async () => {
        const sameInstant = new Date("2026-09-16T12:00:00.000Z");
        fakeDb.seed("a", storedRow({ createdAt: sameInstant }));
        fakeDb.seed("b", storedRow({ createdAt: sameInstant }));
        fakeDb.seed(
            "c",
            storedRow({ createdAt: new Date("2026-09-17T12:00:00.000Z") })
        );

        const page = await auditEventRepository.listPage({}, firstPage);

        expect(page.items.map((row) => row.id)).toEqual(["c", "b", "a"]);
    });

    it("does not filter on deletedAt, since nothing ever sets it", async () => {
        fakeDb.seed("a", storedRow());

        await auditEventRepository.listPage({}, firstPage);

        expect(fakeDb.queries.at(-1)?.clauses).toEqual([]);
    });

    it("matches the user against the actor, the target and the subject alike", async () => {
        fakeDb.seed("acted", storedRow({ involvedUserIds: ["p9", "p2"] }));
        fakeDb.seed("targeted", storedRow({ involvedUserIds: ["p1", "p9"] }));
        fakeDb.seed("unrelated", storedRow({ involvedUserIds: ["p1", "p2"] }));

        const page = await auditEventRepository.listPage(
            { userId: "p9" },
            firstPage
        );

        expect(page.items.map((row) => row.id).sort()).toEqual([
            "acted",
            "targeted",
        ]);
    });

    it("keeps both ends of the period", async () => {
        fakeDb.seed(
            "before",
            storedRow({ createdAt: new Date("2026-08-31T23:59:59.000Z") })
        );
        fakeDb.seed(
            "first-day",
            storedRow({ createdAt: new Date("2026-09-01T00:00:00.000Z") })
        );
        fakeDb.seed(
            "last-day",
            storedRow({ createdAt: new Date("2026-09-16T23:59:59.000Z") })
        );
        fakeDb.seed(
            "after",
            storedRow({ createdAt: new Date("2026-09-17T00:00:01.000Z") })
        );

        const page = await auditEventRepository.listPage(
            {
                from: new Date("2026-09-01T00:00:00.000Z"),
                to: new Date("2026-09-16T23:59:59.999Z"),
            },
            firstPage
        );

        expect(page.items.map((row) => row.id)).toEqual([
            "last-day",
            "first-day",
        ]);
    });

    it("applies the user and the period together", async () => {
        fakeDb.seed(
            "kept",
            storedRow({
                involvedUserIds: ["p9"],
                createdAt: new Date("2026-09-10T00:00:00.000Z"),
            })
        );
        fakeDb.seed(
            "wrong-user",
            storedRow({
                involvedUserIds: ["p1"],
                createdAt: new Date("2026-09-10T00:00:00.000Z"),
            })
        );
        fakeDb.seed(
            "wrong-day",
            storedRow({
                involvedUserIds: ["p9"],
                createdAt: new Date("2026-01-10T00:00:00.000Z"),
            })
        );

        const page = await auditEventRepository.listPage(
            { userId: "p9", from: new Date("2026-09-01T00:00:00.000Z") },
            firstPage
        );

        expect(page.items.map((row) => row.id)).toEqual(["kept"]);
    });

    it("filters by level together with the user and the period", async () => {
        const inPeriod = new Date("2026-09-10T00:00:00.000Z");
        fakeDb.seed(
            "kept",
            storedRow({
                level: AuditLevel.INFO,
                involvedUserIds: ["p9"],
                createdAt: inPeriod,
            })
        );
        fakeDb.seed(
            "sensitive",
            storedRow({ involvedUserIds: ["p9"], createdAt: inPeriod })
        );
        fakeDb.seed(
            "other-user",
            storedRow({
                level: AuditLevel.INFO,
                involvedUserIds: ["p1"],
                createdAt: inPeriod,
            })
        );

        const page = await auditEventRepository.listPage(
            {
                userId: "p9",
                level: AuditLevel.INFO,
                from: new Date("2026-09-01T00:00:00.000Z"),
            },
            firstPage
        );

        expect(page.items.map((row) => row.id)).toEqual(["kept"]);
        expect(fakeDb.queries.at(-1)?.clauses).toContainEqual([
            "level",
            "==",
            AuditLevel.INFO,
        ]);
    });

    it("hands back a cursor and walks each event exactly once", async () => {
        const instant = new Date("2026-09-16T12:00:00.000Z");
        for (const id of ["a", "b", "c", "d"]) {
            fakeDb.seed(id, storedRow({ createdAt: instant }));
        }

        const first = await auditEventRepository.listPage(
            {},
            { limit: 2, cursorId: null }
        );
        const second = await auditEventRepository.listPage(
            {},
            { limit: 2, cursorId: first.nextCursorId }
        );

        expect(first.nextCursorId).toBe("c");
        expect([...first.items, ...second.items].map((row) => row.id)).toEqual([
            "d",
            "c",
            "b",
            "a",
        ]);
        expect(second.nextCursorId).toBeNull();
    });
});
