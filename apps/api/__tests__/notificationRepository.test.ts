import { NOTIFICATION_UNREAD_COUNT_CAP } from "@repo/sdk/src/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;
type Clause = [string, unknown];

const MS_PER_DAY = 86_400_000;
const RETENTION_DAYS = 90;
const MS_PER_SECOND = 1000;
const OWNER_UNREAD = 3;
const OWNER_UNREAD_AFTER_READ = 2;
const MANY_UNREAD = 1200;
/** Firestore caps a batch at 500 writes, so 1200 notifications take three. */
const FULL_BATCH = 500;
const MANY_UNREAD_BATCHES = [
    FULL_BATCH,
    FULL_BATCH,
    MANY_UNREAD - 2 * FULL_BATCH,
];
const LISTED_ROWS = 5;
const ROOMY_EXPORT_CAP = 5;

/**
 * In-memory stand-in for the slice of firebase-admin the notification repository uses.
 * Equality on a missing field never matches, not even `== null`, as in Firestore.
 */
const { fakeDb } = vi.hoisted(() => {
    const MISSING = Symbol("missing");
    // gRPC ALREADY_EXISTS, the status Firestore answers when `create()` hits a taken id.
    const ALREADY_EXISTS = 6;
    const store = new Map<string, Row>();
    const batchSizes: number[] = [];
    const countLimits: (number | null)[] = [];
    let autoId = 0;

    type State = {
        clauses: Clause[];
        limit: number | null;
        ordered: boolean;
        after: string | null;
    };

    const millis = (value: unknown) =>
        value instanceof Date ? value.getTime() : 0;

    const select = (state: State) => {
        let entries = [...store.entries()].filter(([, row]) =>
            state.clauses.every(
                ([field, value]) =>
                    (field in row ? row[field] : MISSING) === value
            )
        );
        if (state.ordered) {
            entries.sort(
                ([idA, a], [idB, b]) =>
                    millis(b.createdAt) - millis(a.createdAt) ||
                    idB.localeCompare(idA)
            );
            if (state.after) {
                const index = entries.findIndex(([id]) => id === state.after);
                entries = entries.slice(index + 1);
            }
        }
        return state.limit === null ? entries : entries.slice(0, state.limit);
    };

    const query = (state: State) => ({
        where: (field: string, _op: string, value: unknown) =>
            query({ ...state, clauses: [...state.clauses, [field, value]] }),
        orderBy: () => query({ ...state, ordered: true }),
        startAfter: (anchor: { id: string }) =>
            query({ ...state, after: anchor.id }),
        limit: (limit: number) => query({ ...state, limit }),
        count: () => ({
            get: () => {
                countLimits.push(state.limit);
                return Promise.resolve({
                    data: () => ({ count: select(state).length }),
                });
            },
        }),
        get: () => {
            const docs = select(state).map(([id, row]) => ({
                id,
                ref: { id },
                data: () => ({ ...row }),
            }));
            return Promise.resolve({ docs, empty: docs.length === 0 });
        },
    });

    const db = {
        collection: () => ({
            ...query({ clauses: [], limit: null, ordered: false, after: null }),
            doc: (id: string) => ({
                id,
                get: () =>
                    Promise.resolve({
                        id,
                        exists: store.has(id),
                        data: () => {
                            const row = store.get(id);
                            return row ? { ...row } : undefined;
                        },
                    }),
                update: (patch: Row) => {
                    const row = store.get(id);
                    if (!row) {
                        return Promise.reject(new Error("no document"));
                    }
                    store.set(id, { ...row, ...patch });
                    return Promise.resolve();
                },
                create: (data: Row) => {
                    if (store.has(id)) {
                        return Promise.reject(
                            Object.assign(new Error("exists"), {
                                code: ALREADY_EXISTS,
                            })
                        );
                    }
                    store.set(id, { ...data });
                    return Promise.resolve();
                },
            }),
            add: (data: Row) => {
                autoId += 1;
                const id = `auto-${autoId}`;
                store.set(id, { ...data });
                return Promise.resolve({ id });
            },
        }),
        batch: () => {
            const ops: (() => void)[] = [];
            return {
                update: (ref: { id: string }, patch: Row) => {
                    ops.push(() =>
                        store.set(ref.id, { ...store.get(ref.id), ...patch })
                    );
                },
                delete: (ref: { id: string }) => {
                    ops.push(() => store.delete(ref.id));
                },
                commit: () => {
                    for (const op of ops) {
                        op();
                    }
                    batchSizes.push(ops.length);
                    return Promise.resolve();
                },
            };
        },
        store,
        batchSizes,
        countLimits,
        reset() {
            store.clear();
            batchSizes.length = 0;
            countLimits.length = 0;
            autoId = 0;
        },
    };

    return { fakeDb: db };
});

vi.mock("@/(shared)/infra/database", () => ({ default: fakeDb }));

const { notificationRepository } = await import(
    "@/(shared)/repositories/notification.repository"
);
const { emitNotification } = await import("@/(shared)/lib/notifications");

const NOW = new Date("2026-10-20T12:00:00.000Z");

function notificationRow(overrides: Row = {}): Row {
    return {
        userId: "owner",
        type: "welcome",
        params: {},
        readAt: null,
        expiresAt: new Date(NOW.getTime() + RETENTION_DAYS * MS_PER_DAY),
        createdAt: NOW,
        updatedAt: NOW,
        deletedAt: null,
        ...overrides,
    };
}

function seedUnread(owner: string, count: number) {
    for (let index = 0; index < count; index++) {
        fakeDb.store.set(
            `${owner}-${index}`,
            notificationRow({ userId: owner })
        );
    }
}

beforeEach(() => {
    fakeDb.reset();
});

describe("emitNotification", () => {
    it("grava não lida, com readAt null explícito e validade de 90 dias", async () => {
        await emitNotification(
            {
                userId: "owner",
                type: "welcome",
                params: {},
                dedupeKey: "owner",
            },
            NOW
        );

        expect(fakeDb.store.get("welcome_owner")).toEqual({
            userId: "owner",
            type: "welcome",
            params: {},
            readAt: null,
            expiresAt: new Date(NOW.getTime() + RETENTION_DAYS * MS_PER_DAY),
            createdAt: NOW,
            updatedAt: NOW,
            deletedAt: null,
        });
    });

    it("não duplica o aviso quando o produtor roda duas vezes com a mesma chave", async () => {
        const input = {
            userId: "owner",
            type: "welcome" as const,
            params: {},
            dedupeKey: "owner",
        };

        await expect(emitNotification(input, NOW)).resolves.toBe("created");
        await expect(emitNotification(input, NOW)).resolves.toBe("duplicate");
        expect(fakeDb.store.size).toBe(1);
    });

    it("deixa o Firestore escolher o id quando não há chave", async () => {
        await emitNotification(
            { userId: "owner", type: "welcome", params: {} },
            NOW
        );
        await emitNotification(
            { userId: "owner", type: "welcome", params: {} },
            NOW
        );

        expect([...fakeDb.store.keys()]).toEqual(["auto-1", "auto-2"]);
    });

    it("propaga uma falha que não é id repetido", async () => {
        const original = fakeDb.collection;
        fakeDb.collection = () =>
            ({
                ...original(),
                doc: () => ({
                    create: () =>
                        Promise.reject(new TypeError("firestore down")),
                }),
            }) as never;

        await expect(
            emitNotification(
                {
                    userId: "owner",
                    type: "welcome",
                    params: {},
                    dedupeKey: "k",
                },
                NOW
            )
        ).rejects.toThrow(TypeError);

        fakeDb.collection = original;
    });
});

describe("notificationRepository", () => {
    it("conta só as não lidas do dono, com teto na própria agregação", async () => {
        seedUnread("owner", OWNER_UNREAD);
        seedUnread("other", 2);
        fakeDb.store.set(
            "owner-read",
            notificationRow({ readAt: NOW, userId: "owner" })
        );

        await expect(
            notificationRepository.countUnreadByUserId("owner")
        ).resolves.toBe(OWNER_UNREAD);
        expect(fakeDb.countLimits).toEqual([NOTIFICATION_UNREAD_COUNT_CAP]);
    });

    it("não conta como não lida um documento gravado sem o campo readAt", async () => {
        const { readAt: _omitted, ...withoutReadAt } = notificationRow();
        fakeDb.store.set("legacy", withoutReadAt);

        await expect(
            notificationRepository.countUnreadByUserId("owner")
        ).resolves.toBe(0);
    });

    it("marca uma com o mesmo instante em readAt e updatedAt e devolve esse instante", async () => {
        fakeDb.store.set("n1", notificationRow());

        const readAt = await notificationRepository.markRead("n1", NOW);

        expect(readAt).toBe(NOW.toISOString());
        expect(fakeDb.store.get("n1")).toMatchObject({
            readAt: NOW,
            updatedAt: NOW,
        });
    });

    it("marca todas do dono em lotes de até 500 e para quando acaba", async () => {
        seedUnread("owner", MANY_UNREAD);
        seedUnread("other", 2);

        const updated = await notificationRepository.markAllReadByUserId(
            "owner",
            NOW
        );

        expect(updated).toBe(MANY_UNREAD);
        expect(fakeDb.batchSizes).toEqual(MANY_UNREAD_BATCHES);
        await expect(
            notificationRepository.countUnreadByUserId("owner")
        ).resolves.toBe(0);
        await expect(
            notificationRepository.countUnreadByUserId("other")
        ).resolves.toBe(2);
    });

    it("responde zero sem gravar nada quando não há não lidas", async () => {
        await expect(
            notificationRepository.markAllReadByUserId("owner", NOW)
        ).resolves.toBe(0);
        expect(fakeDb.batchSizes).toEqual([]);
    });

    it("lista só o dono, mais recentes primeiro, sem repetir entre páginas", async () => {
        for (let index = 0; index < LISTED_ROWS; index++) {
            fakeDb.store.set(
                `n${index}`,
                notificationRow({
                    createdAt: new Date(NOW.getTime() + index * MS_PER_SECOND),
                })
            );
        }
        fakeDb.store.set("foreign", notificationRow({ userId: "other" }));

        const first = await notificationRepository.listByUserId("owner", {
            limit: 3,
            cursorId: null,
        });
        const second = await notificationRepository.listByUserId("owner", {
            limit: 3,
            cursorId: first.nextCursorId,
        });

        expect(first.items.map((item) => item.id)).toEqual(["n4", "n3", "n2"]);
        expect(first.nextCursorId).toBe("n2");
        expect(second.items.map((item) => item.id)).toEqual(["n1", "n0"]);
        expect(second.nextCursorId).toBeNull();
    });

    it("exporta o dono inteiro e avisa o corte", async () => {
        seedUnread("owner", OWNER_UNREAD);
        seedUnread("other", 1);

        const full = await notificationRepository.findAllByUserId(
            "owner",
            ROOMY_EXPORT_CAP
        );
        const capped = await notificationRepository.findAllByUserId("owner", 2);

        expect(full.items).toHaveLength(OWNER_UNREAD);
        expect(full.truncated).toBe(false);
        expect(full.items.every((item) => item.userId === "owner")).toBe(true);
        expect(capped.items).toHaveLength(2);
        expect(capped.truncated).toBe(true);
    });

    it("expurga só as do dono, lidas ou não", async () => {
        seedUnread("owner", OWNER_UNREAD_AFTER_READ);
        fakeDb.store.set(
            "owner-read",
            notificationRow({ readAt: NOW, userId: "owner" })
        );
        seedUnread("other", 1);

        await expect(
            notificationRepository.purgeAllByUserId("owner")
        ).resolves.toBe(OWNER_UNREAD_AFTER_READ + 1);
        expect([...fakeDb.store.keys()]).toEqual(["other-0"]);
    });
});
