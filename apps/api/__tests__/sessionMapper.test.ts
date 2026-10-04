import { Timestamp } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";
import { sessionMapper } from "@/(shared)/mappers/session.mapper";

const KEY = "1790500000";
const SIGNED_IN_ISO = "2026-09-27T09:06:40.000Z";
const SEEN_ISO = "2026-09-29T11:45:00.000Z";

describe("sessionMapper.toDTO", () => {
    it("normaliza Timestamp para ISO", () => {
        const record = sessionMapper.toDTO({
            id: `uid-1_${KEY}`,
            uid: "uid-1",
            sessionKey: KEY,
            signedInAt: Timestamp.fromDate(new Date(SIGNED_IN_ISO)),
            lastSeenAt: Timestamp.fromDate(new Date(SEEN_ISO)),
            browser: "Chrome",
            os: "macOS",
            deviceType: "desktop",
            revokedAt: Timestamp.fromDate(new Date(SEEN_ISO)),
            revokedReason: "revoked",
            createdAt: Timestamp.fromDate(new Date(SIGNED_IN_ISO)),
            updatedAt: Timestamp.fromDate(new Date(SEEN_ISO)),
            deletedAt: null,
        });

        expect(record).toMatchObject({
            sessionKey: KEY,
            signedInAt: SIGNED_IN_ISO,
            lastSeenAt: SEEN_ISO,
            revokedAt: SEEN_ISO,
            revokedReason: "revoked",
            othersRevokedBefore: null,
            deletedAt: null,
        });
    });

    it("lê campos ausentes como null e deriva o início da chave", () => {
        const record = sessionMapper.toDTO({
            id: `uid-1_${KEY}`,
            uid: "uid-1",
            sessionKey: KEY,
            revokedAt: new Date(SEEN_ISO),
            revokedReason: "signed-out",
        });

        expect(record).toMatchObject({
            signedInAt: SIGNED_IN_ISO,
            lastSeenAt: SIGNED_IN_ISO,
            browser: null,
            os: null,
            deviceType: null,
            othersRevokedBefore: null,
            deletedAt: null,
        });
    });

    it("descarta tipo de aparelho e motivo fora da lista", () => {
        const record = sessionMapper.toDTO({
            id: `uid-1_${KEY}`,
            sessionKey: KEY,
            deviceType: "smart-fridge",
            revokedReason: "because",
            browser: "   ",
        });

        expect(record.deviceType).toBeNull();
        expect(record.revokedReason).toBeNull();
        expect(record.browser).toBeNull();
    });
});

describe("sessionMapper.toPersistence", () => {
    it("só grava os campos da lista, nunca o id nem os carimbos", () => {
        const persisted = sessionMapper.toPersistence({
            id: "forged",
            uid: "uid-1",
            sessionKey: KEY,
            browser: "Chrome",
            createdAt: SIGNED_IN_ISO,
            updatedAt: SEEN_ISO,
            deletedAt: null,
            ...({ userAgent: "Mozilla/5.0 raw" } as Record<string, unknown>),
        });

        expect(persisted).toEqual({
            uid: "uid-1",
            sessionKey: KEY,
            browser: "Chrome",
        });
    });
});
