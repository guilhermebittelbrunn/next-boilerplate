import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;

/** Just the surface the session repository touches, with `set(..., { merge })` semantics. */
const { fakeDb, store, committedBatches } = vi.hoisted(() => {
    const rows = new Map<string, Record<string, unknown>>();
    const batches: number[] = [];

    const write = (
        id: string,
        data: Record<string, unknown>,
        options?: { merge?: boolean }
    ) => {
        rows.set(id, options?.merge ? { ...rows.get(id), ...data } : data);
    };

    const docRef = (id: string) => ({
        id,
        get: () =>
            Promise.resolve({
                id,
                exists: rows.has(id),
                data: () => rows.get(id),
            }),
        set: (data: Record<string, unknown>, options?: { merge?: boolean }) => {
            write(id, data, options);
            return Promise.resolve();
        },
        update: (data: Record<string, unknown>) => {
            if (!rows.has(id)) {
                return Promise.reject(new Error("NOT_FOUND"));
            }
            write(id, data, { merge: true });
            return Promise.resolve();
        },
    });

    const query = (field: string, value: unknown) => ({
        limit: () => query(field, value),
        get: () => {
            const docs = [...rows.entries()]
                .filter(([, data]) => data[field] === value)
                .map(([docId, data]) => ({
                    id: docId,
                    data: () => data,
                    ref: docRef(docId),
                }));
            return Promise.resolve({ docs, empty: docs.length === 0 });
        },
    });

    return {
        store: rows,
        committedBatches: batches,
        fakeDb: {
            collection: () => ({
                doc: (id: string) => docRef(id),
                where: (field: string, _op: string, value: unknown) =>
                    query(field, value),
            }),
            batch: () => {
                const pending: (() => void)[] = [];
                return {
                    set: (
                        ref: { id: string },
                        data: Record<string, unknown>,
                        options?: { merge?: boolean }
                    ) => {
                        pending.push(() => write(ref.id, data, options));
                    },
                    delete: (ref: { id: string }) => {
                        pending.push(() => rows.delete(ref.id));
                    },
                    commit: () => {
                        batches.push(pending.length);
                        for (const apply of pending) {
                            apply();
                        }
                        return Promise.resolve();
                    },
                };
            },
        },
    };
});

vi.mock("@/(shared)/infra/database", () => ({ default: fakeDb }));
vi.mock("@repo/auth/server", () => ({
    decodeSessionCookie: vi.fn(),
    verifyIdTokenClaims: vi.fn(),
}));
vi.mock("@repo/auth/session", () => ({
    SESSION_COOKIE_NAME: "access-token",
    resolveSessionOriginSeconds: vi.fn(),
}));

const { sessionRepository } = await import(
    "@/(shared)/repositories/session.repository"
);

const UID = "uid-1";
const CURRENT = "1790800000";
const OTHER = "1790500000";
const ENDED = "1790400000";
const AT = new Date("2026-09-30T12:00:00.000Z");
const MS_PER_SECOND = 1000;
const CHROME = {
    browser: "Chrome",
    os: "macOS",
    deviceType: "desktop" as const,
};

function row(id: string): Row | undefined {
    return store.get(id);
}

beforeEach(() => {
    store.clear();
    committedBatches.length = 0;
});

describe("sessionRepository.createSeen", () => {
    it("não apaga uma revogação gravada em paralelo", async () => {
        await sessionRepository.revoke(UID, OTHER, "revoked", AT);

        await sessionRepository.createSeen({
            uid: UID,
            sessionKey: OTHER,
            at: AT,
            device: CHROME,
            revokedAt: null,
        });

        const record = await sessionRepository.findByUidAndKey(UID, OTHER);
        expect(record?.revokedAt).toBe(AT.toISOString());
        expect(record?.browser).toBe("Chrome");
    });

    it("grava a sessão coberta pela marca d'água já encerrada", async () => {
        await sessionRepository.createSeen({
            uid: UID,
            sessionKey: OTHER,
            at: AT,
            device: null,
            revokedAt: AT,
        });

        expect(row(`${UID}_${OTHER}`)).toMatchObject({
            revokedAt: AT,
            revokedReason: "others",
            browser: null,
        });
    });
});

describe("sessionRepository.revoke", () => {
    it("alcança uma sessão que a API nunca viu, e ela passa a ser listada", async () => {
        await sessionRepository.revoke(UID, OTHER, "signed-out", AT);

        const [listed] = await sessionRepository.listByUid(UID);
        expect(listed).toMatchObject({
            sessionKey: OTHER,
            revokedAt: AT.toISOString(),
            revokedReason: "signed-out",
            signedInAt: new Date(Number(OTHER) * MS_PER_SECOND).toISOString(),
        });
    });
});

describe("sessionRepository.revokeOthers", () => {
    it("encerra as outras abertas, mantém a atual e marca nela a marca d'água", async () => {
        for (const key of [CURRENT, OTHER, ENDED]) {
            await sessionRepository.createSeen({
                uid: UID,
                sessionKey: key,
                at: AT,
                device: CHROME,
                revokedAt: null,
            });
        }
        const EARLIER = new Date("2026-09-29T00:00:00.000Z");
        await sessionRepository.revoke(UID, ENDED, "revoked", EARLIER);
        await sessionRepository.createSeen({
            uid: "someone-else",
            sessionKey: OTHER,
            at: AT,
            device: CHROME,
            revokedAt: null,
        });

        const revoked = await sessionRepository.revokeOthers(UID, CURRENT, AT);

        expect(revoked).toBe(1);
        expect(row(`${UID}_${OTHER}`)).toMatchObject({
            revokedAt: AT,
            revokedReason: "others",
        });
        expect(row(`${UID}_${ENDED}`)).toMatchObject({
            revokedAt: EARLIER,
            revokedReason: "revoked",
        });
        expect(row(`${UID}_${CURRENT}`)).toMatchObject({
            othersRevokedBefore: AT,
        });
        expect(row(`${UID}_${CURRENT}`)?.revokedAt).toBeUndefined();
        expect(row(`someone-else_${OTHER}`)?.revokedAt).toBeUndefined();
    });
});

describe("sessionRepository.purgeAllByUid", () => {
    it("apaga todas as sessões do titular, encerradas inclusive, e só as dele", async () => {
        await sessionRepository.createSeen({
            uid: UID,
            sessionKey: CURRENT,
            at: AT,
            device: CHROME,
            revokedAt: null,
        });
        await sessionRepository.revoke(UID, OTHER, "revoked", AT);
        await sessionRepository.createSeen({
            uid: "someone-else",
            sessionKey: CURRENT,
            at: AT,
            device: CHROME,
            revokedAt: null,
        });

        await expect(sessionRepository.purgeAllByUid(UID)).resolves.toBe(2);
        expect([...store.keys()]).toEqual([`someone-else_${CURRENT}`]);
    });
});
