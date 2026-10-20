import { Timestamp } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";
import { notificationMapper } from "@/(shared)/mappers/notification.mapper";

const CREATED = "2026-10-20T12:00:00.000Z";
const EXPIRES = "2027-01-18T12:00:00.000Z";

describe("notificationMapper.toDTO", () => {
    it("converte os instantes do Firestore para ISO", () => {
        const dto = notificationMapper.toDTO({
            id: "welcome_p1",
            userId: "p1",
            type: "welcome",
            params: {},
            readAt: Timestamp.fromDate(new Date(CREATED)),
            expiresAt: Timestamp.fromDate(new Date(EXPIRES)),
            createdAt: Timestamp.fromDate(new Date(CREATED)),
            updatedAt: Timestamp.fromDate(new Date(CREATED)),
            deletedAt: null,
        });

        expect(dto).toEqual({
            id: "welcome_p1",
            userId: "p1",
            type: "welcome",
            params: {},
            readAt: CREATED,
            expiresAt: EXPIRES,
            createdAt: CREATED,
            updatedAt: CREATED,
            deletedAt: null,
        });
    });

    it("lê não lida e sem validade como null", () => {
        const dto = notificationMapper.toDTO({
            id: "n1",
            userId: "p1",
            type: "welcome",
            createdAt: CREATED,
            updatedAt: CREATED,
        });

        expect(dto.readAt).toBeNull();
        expect(dto.expiresAt).toBeNull();
        expect(dto.deletedAt).toBeNull();
        expect(dto.params).toEqual({});
    });

    it("preserva um tipo que este build não conhece", () => {
        const dto = notificationMapper.toDTO({
            id: "n1",
            userId: "p1",
            type: "legacyTypeRemoved",
            createdAt: CREATED,
            updatedAt: CREATED,
        });

        expect(dto.type).toBe("legacyTypeRemoved");
    });

    it("descarta parâmetros que não podem ser interpolados", () => {
        const dto = notificationMapper.toDTO({
            id: "n1",
            userId: "p1",
            type: "welcome",
            params: {
                plan: "Pro",
                seats: 3,
                trial: false,
                note: null,
                nested: { a: 1 },
                list: [1, 2],
                missing: undefined,
            },
            createdAt: CREATED,
            updatedAt: CREATED,
        });

        expect(dto.params).toEqual({
            plan: "Pro",
            seats: 3,
            trial: false,
            note: null,
        });
    });

    it("lê params que não é objeto como vazio", () => {
        const dto = notificationMapper.toDTO({
            id: "n1",
            userId: "p1",
            type: "welcome",
            params: ["a"],
            createdAt: CREATED,
            updatedAt: CREATED,
        });

        expect(dto.params).toEqual({});
    });
});

describe("notificationMapper.toPersistence", () => {
    it("grava só os campos do documento, nunca id nem carimbos", () => {
        expect(
            notificationMapper.toPersistence({
                id: "n1",
                userId: "p1",
                type: "welcome",
                params: {},
                readAt: null,
                createdAt: CREATED,
                updatedAt: CREATED,
                deletedAt: null,
            })
        ).toEqual({ userId: "p1", type: "welcome", params: {}, readAt: null });
    });
});
