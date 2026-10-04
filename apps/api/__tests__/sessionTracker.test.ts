import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionRecord } from "@/(shared)/mappers/session.mapper";

const {
    findByUidAndKeyMock,
    listByUidMock,
    createSeenMock,
    touchSeenMock,
    logEventMock,
} = vi.hoisted(() => ({
    findByUidAndKeyMock: vi.fn(),
    listByUidMock: vi.fn(),
    createSeenMock: vi.fn(),
    touchSeenMock: vi.fn(),
    logEventMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@repo/auth/server", () => ({
    createSessionCookie: vi.fn(),
    verifyIdTokenClaims: vi.fn(),
}));
vi.mock("@/(shared)/repositories/session.repository", () => ({
    sessionRepository: {
        findByUidAndKey: (...args: unknown[]) => findByUidAndKeyMock(...args),
        listByUid: (...args: unknown[]) => listByUidMock(...args),
        createSeen: (...args: unknown[]) => createSeenMock(...args),
        touchSeen: (...args: unknown[]) => touchSeenMock(...args),
    },
}));
vi.mock("@repo/shared/utils/helpers/log", () => ({
    logEvent: (...args: unknown[]) => logEventMock(...args),
}));

const { trackSession } = await import("@/(shared)/lib/session-tracker");

const UID = "uid-1";
const KEY = "1790500000";
const MS_PER_SECOND = 1000;
const KEY_MS = Number(KEY) * MS_PER_SECOND;
const NOW = new Date("2026-09-30T12:00:00.000Z");
const MINUTE_MS = 60_000;
const SAFARI_IPHONE =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1";

function session(overrides: Partial<SessionRecord> = {}): SessionRecord {
    return {
        id: `${UID}_${KEY}`,
        uid: UID,
        sessionKey: KEY,
        signedInAt: new Date(KEY_MS).toISOString(),
        lastSeenAt: new Date(NOW.getTime() - MINUTE_MS).toISOString(),
        browser: "Safari",
        os: "iOS",
        deviceType: "mobile",
        revokedAt: null,
        revokedReason: null,
        othersRevokedBefore: null,
        createdAt: new Date(KEY_MS).toISOString(),
        updatedAt: new Date(KEY_MS).toISOString(),
        deletedAt: null,
        ...overrides,
    };
}

function track(userAgent: string | null = SAFARI_IPHONE) {
    return trackSession({ uid: UID, sessionKey: KEY, userAgent, now: NOW });
}

beforeEach(() => {
    for (const mock of [
        findByUidAndKeyMock,
        listByUidMock,
        createSeenMock,
        touchSeenMock,
        logEventMock,
    ]) {
        mock.mockReset();
    }
    listByUidMock.mockResolvedValue([]);
    createSeenMock.mockResolvedValue(undefined);
    touchSeenMock.mockResolvedValue(undefined);
});

describe("trackSession", () => {
    it("registra a sessão nova com o aparelho do navegador", async () => {
        findByUidAndKeyMock.mockResolvedValue(null);

        await expect(track()).resolves.toBe("active");
        expect(createSeenMock).toHaveBeenCalledWith({
            uid: UID,
            sessionKey: KEY,
            at: NOW,
            device: { browser: "Safari", os: "iOS", deviceType: "mobile" },
            revokedAt: null,
        });
    });

    it("recusa no primeiro contato a sessão aberta antes de um 'encerrar as outras'", async () => {
        findByUidAndKeyMock.mockResolvedValue(null);
        listByUidMock.mockResolvedValue([
            session({
                id: `${UID}_1790600000`,
                sessionKey: "1790600000",
                othersRevokedBefore: new Date(KEY_MS + MINUTE_MS).toISOString(),
            }),
        ]);

        await expect(track()).resolves.toBe("revoked");
        expect(createSeenMock).toHaveBeenCalledWith(
            expect.objectContaining({ revokedAt: NOW })
        );
    });

    it("aceita a sessão nova aberta depois do 'encerrar as outras'", async () => {
        findByUidAndKeyMock.mockResolvedValue(null);
        listByUidMock.mockResolvedValue([
            session({
                id: `${UID}_1790400000`,
                sessionKey: "1790400000",
                othersRevokedBefore: new Date(KEY_MS - MINUTE_MS).toISOString(),
            }),
        ]);

        await expect(track()).resolves.toBe("active");
    });

    describe("marca d'água no mesmo segundo do login", () => {
        function watermarkAt(instantMs: number) {
            listByUidMock.mockResolvedValue([
                session({
                    id: `${UID}_1790600000`,
                    sessionKey: "1790600000",
                    othersRevokedBefore: new Date(instantMs).toISOString(),
                }),
            ]);
        }

        const CLICK_AT_700_MS = 700;
        const FIRST_MS = 1;
        const LAST_MS = MS_PER_SECOND - 1;

        it.each([
            ["login em T.300, clique em T.700", CLICK_AT_700_MS],
            ["clique em T.700, login em T.900", CLICK_AT_700_MS],
            ["clique em T.001", FIRST_MS],
            ["clique em T.999", LAST_MS],
        ])(
            "recusa a sessão do segundo T (%s)",
            async (_case, clickOffsetMs) => {
                findByUidAndKeyMock.mockResolvedValue(null);
                watermarkAt(KEY_MS + clickOffsetMs);

                await expect(track()).resolves.toBe("revoked");
                expect(createSeenMock).toHaveBeenCalledWith(
                    expect.objectContaining({ revokedAt: NOW })
                );
            }
        );

        it("aceita a sessão quando o clique cai exatamente em T.000", async () => {
            findByUidAndKeyMock.mockResolvedValue(null);
            watermarkAt(KEY_MS);

            await expect(track()).resolves.toBe("active");
        });

        it("aceita a sessão do segundo seguinte ao clique", async () => {
            findByUidAndKeyMock.mockResolvedValue(null);
            watermarkAt(KEY_MS - 1);

            await expect(track()).resolves.toBe("active");
        });
    });

    it("não se cobre pela própria marca d'água", async () => {
        findByUidAndKeyMock.mockResolvedValue(null);
        listByUidMock.mockResolvedValue([
            session({
                othersRevokedBefore: new Date(KEY_MS + MINUTE_MS).toISOString(),
            }),
        ]);

        await expect(track()).resolves.toBe("active");
    });

    it("recusa a sessão encerrada sem escrever nada", async () => {
        findByUidAndKeyMock.mockResolvedValue(
            session({ revokedAt: NOW.toISOString(), revokedReason: "revoked" })
        );

        await expect(track()).resolves.toBe("revoked");
        expect(touchSeenMock).not.toHaveBeenCalled();
        expect(createSeenMock).not.toHaveBeenCalled();
    });

    it("não escreve quando o último uso está dentro da janela", async () => {
        findByUidAndKeyMock.mockResolvedValue(session());

        await expect(track()).resolves.toBe("active");
        expect(touchSeenMock).not.toHaveBeenCalled();
    });

    it("avança o último uso passada a janela, sem trocar o aparelho", async () => {
        const FIFTEEN_MINUTES = 15;
        findByUidAndKeyMock.mockResolvedValue(
            session({
                lastSeenAt: new Date(
                    NOW.getTime() - FIFTEEN_MINUTES * MINUTE_MS
                ).toISOString(),
            })
        );

        await track();

        expect(touchSeenMock).toHaveBeenCalledWith(`${UID}_${KEY}`, NOW, null);
    });

    it("grava o aparelho que faltava quando um navegador aparece", async () => {
        findByUidAndKeyMock.mockResolvedValue(
            session({ browser: null, os: null, deviceType: null })
        );

        await track();

        expect(touchSeenMock).toHaveBeenCalledWith(`${UID}_${KEY}`, NOW, {
            browser: "Safari",
            os: "iOS",
            deviceType: "mobile",
        });
    });

    it("não deixa o servidor do front-end descrever a sessão", async () => {
        findByUidAndKeyMock.mockResolvedValue(null);

        await track("node");

        expect(createSeenMock).toHaveBeenCalledWith(
            expect.objectContaining({ device: null })
        );
    });

    it("deixa passar e registra quando a leitura falha", async () => {
        findByUidAndKeyMock.mockRejectedValue(
            new TypeError("session/uid-1_1790500000 unavailable")
        );

        await expect(track()).resolves.toBe("active");
        expect(logEventMock).toHaveBeenCalledWith(
            "auth",
            "session-check-failed",
            { reason: "TypeError" }
        );
        expect(JSON.stringify(logEventMock.mock.calls)).not.toContain(UID);
    });

    it("não muda a resposta quando a escrita falha", async () => {
        findByUidAndKeyMock.mockResolvedValue(null);
        createSeenMock.mockRejectedValue(new Error("write refused"));

        await expect(track()).resolves.toBe("active");
        expect(logEventMock).toHaveBeenCalledWith(
            "auth",
            "session-touch-failed",
            { reason: "Error" }
        );
    });

    it("mantém a recusa da marca d'água mesmo se a escrita falhar", async () => {
        findByUidAndKeyMock.mockResolvedValue(null);
        listByUidMock.mockResolvedValue([
            session({
                id: `${UID}_1790600000`,
                sessionKey: "1790600000",
                othersRevokedBefore: new Date(KEY_MS + MINUTE_MS).toISOString(),
            }),
        ]);
        createSeenMock.mockRejectedValue(new Error("write refused"));

        await expect(track()).resolves.toBe("revoked");
    });
});
