import { AuditAction, AuditTargetType } from "@repo/sdk/src/types";
import { Timestamp } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";
import { auditEventMapper } from "@/(shared)/mappers/audit-event.mapper";

const CREATED_AT_ISO = "2026-09-16T14:00:03.117Z";

function row(overrides: Record<string, unknown> = {}) {
    return {
        id: "evt-1",
        action: AuditAction.USER_DELETE,
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
        createdAt: Timestamp.fromDate(new Date(CREATED_AT_ISO)),
        updatedAt: Timestamp.fromDate(new Date(CREATED_AT_ISO)),
        deletedAt: null,
        ...overrides,
    };
}

describe("auditEventMapper.toDTO", () => {
    it("serializes the stored timestamps as ISO strings", () => {
        const dto = auditEventMapper.toDTO(row());

        expect(dto.createdAt).toBe(CREATED_AT_ISO);
        expect(dto.updatedAt).toBe(CREATED_AT_ISO);
        expect(JSON.stringify(dto)).not.toContain("_seconds");
    });

    it("keeps deletedAt null instead of falling back to the epoch", () => {
        expect(auditEventMapper.toDTO(row()).deletedAt).toBeNull();
    });

    it("normalizes the impersonation window end when it is set", () => {
        const dto = auditEventMapper.toDTO(
            row({
                action: AuditAction.IMPERSONATION_SESSION,
                windowEndsAt: Timestamp.fromDate(
                    new Date("2026-09-16T14:15:00.000Z")
                ),
            })
        );

        expect(dto.windowEndsAt).toBe("2026-09-16T14:15:00.000Z");
    });

    it("leaves the window end null on every other action", () => {
        expect(auditEventMapper.toDTO(row()).windowEndsAt).toBeNull();
    });

    it("turns missing optional strings into null", () => {
        const dto = auditEventMapper.toDTO(
            row({
                actorLabel: undefined,
                targetLabel: undefined,
                targetUserId: undefined,
                requestId: undefined,
            })
        );

        expect(dto.actorLabel).toBeNull();
        expect(dto.targetLabel).toBeNull();
        expect(dto.targetUserId).toBeNull();
        expect(dto.requestId).toBeNull();
    });

    it("turns missing arrays into empty ones", () => {
        const dto = auditEventMapper.toDTO(
            row({ changedFields: undefined, involvedUserIds: undefined })
        );

        expect(dto.changedFields).toEqual([]);
        expect(dto.involvedUserIds).toEqual([]);
    });

    it("drops non-string entries a hand-edited document could carry", () => {
        const dto = auditEventMapper.toDTO(
            row({ changedFields: ["type", Number.NaN, null, "disabled"] })
        );

        expect(dto.changedFields).toEqual(["type", "disabled"]);
    });

    it("carries the document id into the DTO", () => {
        expect(auditEventMapper.toDTO(row()).id).toBe("evt-1");
    });
});

describe("auditEventMapper.toPersistence", () => {
    it("never writes the timestamps the repository owns", () => {
        const persisted = auditEventMapper.toPersistence({
            action: AuditAction.USER_UPDATE,
            createdAt: CREATED_AT_ISO,
            updatedAt: CREATED_AT_ISO,
            deletedAt: null,
        });

        expect(persisted).toEqual({ action: AuditAction.USER_UPDATE });
    });

    it("keeps only the fields it was handed", () => {
        const persisted = auditEventMapper.toPersistence({
            actorUserId: "p1",
            involvedUserIds: ["p1", "p2"],
        });

        expect(persisted).toEqual({
            actorUserId: "p1",
            involvedUserIds: ["p1", "p2"],
        });
    });
});
