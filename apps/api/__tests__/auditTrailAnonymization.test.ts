import { AuditAction, AuditTargetType } from "@repo/sdk/src/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;
type Clause = [string, string, unknown];

/**
 * In-memory stand-in for the slice of firebase-admin this sweep touches: the
 * `array-contains` filter, cursor paging by document id and a `WriteBatch` of updates.
 *
 * Ordering is only honoured for `FieldPath.documentId()`, which is the only ordering the
 * sweep asks for. Anything else throws, so a query that would need a composite index
 * cannot slip in unnoticed.
 */
const { fakeDb } = vi.hoisted(() => {
    const rows = new Map<string, Row>();
    const committedBatches: number[] = [];
    const emittedOrders: string[] = [];
    let pagesServed = 0;
    /** Makes the cursor useless, the way a trail that keeps growing would. */
    let stallCursor = false;

    const matches = (row: Row, clauses: Clause[]) =>
        clauses.every(([field, op, value]) => {
            if (op !== "array-contains") {
                throw new Error(`Unsupported query operator: ${op}`);
            }
            const actual = row[field];
            return Array.isArray(actual) && actual.includes(value);
        });

    type QueryState = {
        clauses: Clause[];
        limitTo: number | null;
        ordered: boolean;
        after: string | null;
    };

    const makeQuery = (state: QueryState) => ({
        where(field: string, op: string, value: unknown) {
            return makeQuery({
                ...state,
                clauses: [...state.clauses, [field, op, value]],
            });
        },
        limit(count: number) {
            return makeQuery({ ...state, limitTo: count });
        },
        orderBy(field: unknown) {
            const name = String(field);
            emittedOrders.push(name);
            if (name !== "__name__") {
                throw new Error(`Unsupported ordering: ${name}`);
            }
            return makeQuery({ ...state, ordered: true });
        },
        startAfter(anchor: { id: string }) {
            if (!state.ordered) {
                throw new Error("startAfter without an ordering");
            }
            return makeQuery({ ...state, after: anchor.id });
        },
        get() {
            let entries = [...rows.entries()].filter(([, row]) =>
                matches(row, state.clauses)
            );
            if (state.ordered) {
                entries.sort(([left], [right]) => left.localeCompare(right));
            }
            if (state.after !== null && !stallCursor) {
                const at = entries.findIndex(([id]) => id === state.after);
                entries = entries.slice(at + 1);
            }
            if (state.limitTo !== null) {
                entries = entries.slice(0, state.limitTo);
            }

            pagesServed++;

            return Promise.resolve({
                empty: entries.length === 0,
                docs: entries.map(([id, row]) => ({
                    id,
                    ref: { id },
                    exists: true,
                    data: () => ({ ...row }),
                })),
            });
        },
    });

    const db = {
        collection() {
            return makeQuery({
                clauses: [],
                limitTo: null,
                ordered: false,
                after: null,
            });
        },
        batch() {
            const writes: { id: string; patch: Row }[] = [];
            return {
                update(ref: { id: string }, patch: Row) {
                    writes.push({ id: ref.id, patch });
                },
                commit() {
                    for (const { id, patch } of writes) {
                        const row = rows.get(id);
                        if (!row) {
                            return Promise.reject(
                                new Error(`No document to update: ${id}`)
                            );
                        }
                        rows.set(id, { ...row, ...patch });
                    }
                    committedBatches.push(writes.length);
                    return Promise.resolve([]);
                },
            };
        },
        seed(id: string, row: Row) {
            rows.set(id, row);
        },
        read(id: string) {
            return rows.get(id);
        },
        batches: committedBatches,
        orders: emittedOrders,
        get pages() {
            return pagesServed;
        },
        stallTheCursor() {
            stallCursor = true;
        },
        reset() {
            rows.clear();
            committedBatches.length = 0;
            emittedOrders.length = 0;
            pagesServed = 0;
            stallCursor = false;
        },
    };

    return { fakeDb: db };
});

vi.mock("@/(shared)/infra/database", () => ({ default: fakeDb }));

const { auditEventRepository } = await import(
    "@/(shared)/repositories/audit-event.repository"
);

const OWNER_ID = "profile-1";
const OWNER_EMAIL = "owner@example.com";
const ADMIN_ID = "admin-profile";
const ADMIN_EMAIL = "admin@example.com";
const CREATED_AT = new Date("2026-09-20T12:00:00.000Z");

/** Firestore refuses a batch with more than 500 writes. */
const WRITE_BATCH_SIZE = 500;
const OVER_ONE_BATCH = WRITE_BATCH_SIZE + 1;

function selfEvent(overrides: Row = {}): Row {
    return {
        action: AuditAction.ACCOUNT_PASSWORD_CHANGE,
        actorUserId: OWNER_ID,
        actorUid: "common-9",
        actorLabel: OWNER_EMAIL,
        onBehalfOfUserId: null,
        targetType: AuditTargetType.ACCOUNT,
        targetUserId: OWNER_ID,
        targetLabel: OWNER_EMAIL,
        changedFields: [],
        involvedUserIds: [OWNER_ID],
        requestId: "req-1",
        windowEndsAt: null,
        createdAt: CREATED_AT,
        updatedAt: CREATED_AT,
        deletedAt: null,
        ...overrides,
    };
}

function operatorEvent(overrides: Row = {}): Row {
    return selfEvent({
        action: AuditAction.USER_UPDATE,
        actorUserId: ADMIN_ID,
        actorUid: "admin-1",
        actorLabel: ADMIN_EMAIL,
        targetType: AuditTargetType.USER,
        involvedUserIds: [ADMIN_ID, OWNER_ID],
        ...overrides,
    });
}

beforeEach(() => {
    fakeDb.reset();
});

describe("auditEventRepository.anonymizeUserLabels", () => {
    it("tira o e-mail do titular dos dois papéis do próprio evento", async () => {
        fakeDb.seed("evt-1", selfEvent());

        const changed =
            await auditEventRepository.anonymizeUserLabels(OWNER_ID);

        expect(changed).toBe(1);
        expect(fakeDb.read("evt-1")).toMatchObject({
            actorLabel: null,
            targetLabel: null,
        });
    });

    it("preserva a ação, o instante e o requestId do evento", async () => {
        fakeDb.seed("evt-1", selfEvent());

        await auditEventRepository.anonymizeUserLabels(OWNER_ID);

        expect(fakeDb.read("evt-1")).toMatchObject({
            action: AuditAction.ACCOUNT_PASSWORD_CHANGE,
            createdAt: CREATED_AT,
            requestId: "req-1",
            targetUserId: OWNER_ID,
        });
    });

    it("mantém o rótulo do admin que agiu: ele não pediu eliminação nenhuma", async () => {
        fakeDb.seed("evt-2", operatorEvent());

        await auditEventRepository.anonymizeUserLabels(OWNER_ID);

        expect(fakeDb.read("evt-2")).toMatchObject({
            actorLabel: ADMIN_EMAIL,
            targetLabel: null,
        });
    });

    it("não toca em evento de outra pessoa", async () => {
        fakeDb.seed(
            "evt-3",
            selfEvent({
                actorUserId: "profile-2",
                targetUserId: "profile-2",
                actorLabel: "other@example.com",
                targetLabel: "other@example.com",
                involvedUserIds: ["profile-2"],
            })
        );

        const changed =
            await auditEventRepository.anonymizeUserLabels(OWNER_ID);

        expect(changed).toBe(0);
        expect(fakeDb.read("evt-3")).toMatchObject({
            actorLabel: "other@example.com",
        });
    });

    it("não grava de novo o evento que já está anonimizado", async () => {
        fakeDb.seed(
            "evt-1",
            selfEvent({ actorLabel: null, targetLabel: null })
        );

        const changed =
            await auditEventRepository.anonymizeUserLabels(OWNER_ID);

        expect(changed).toBe(0);
        expect(fakeDb.batches).toEqual([]);
    });

    it("quebra a varredura em lotes de 500 escritas", async () => {
        for (let index = 0; index < OVER_ONE_BATCH; index++) {
            fakeDb.seed(`evt-${index}`, selfEvent());
        }

        const changed =
            await auditEventRepository.anonymizeUserLabels(OWNER_ID);

        expect(changed).toBe(OVER_ONE_BATCH);
        expect(fakeDb.batches).toEqual([WRITE_BATCH_SIZE, 1]);
    });

    it("pagina com cursor em vez de carregar a trilha inteira", async () => {
        for (let index = 0; index < OVER_ONE_BATCH; index++) {
            fakeDb.seed(`evt-${index}`, selfEvent());
        }

        await auditEventRepository.anonymizeUserLabels(OWNER_ID);

        // Uma leitura por lote: 500 e o resto. Sem cursor seriam 501 documentos numa
        // única consulta, que é o que fazia a varredura crescer sem teto.
        expect(fakeDb.pages).toBe(2);
    });

    it("ordena só por id de documento, para não exigir índice composto", async () => {
        fakeDb.seed("evt-1", selfEvent());

        await auditEventRepository.anonymizeUserLabels(OWNER_ID);

        expect(fakeDb.orders).toEqual(["__name__"]);
    });

    it("para e acusa quando a trilha não drena, em vez de girar para sempre", async () => {
        for (let index = 0; index < WRITE_BATCH_SIZE; index++) {
            fakeDb.seed(`evt-${index}`, selfEvent());
        }
        fakeDb.stallTheCursor();

        await expect(
            auditEventRepository.anonymizeUserLabels(OWNER_ID)
        ).rejects.toThrow("Anonymization stopped after changing");
    });

    it("continua recusando update e delete pela porta da frente", () => {
        expect(() => auditEventRepository.update()).toThrow(
            "Audit events are append-only"
        );
        expect(() => auditEventRepository.delete()).toThrow(
            "Audit events are append-only"
        );
    });
});
