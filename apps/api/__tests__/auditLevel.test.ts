import { AuditAction, AuditLevel } from "@repo/sdk/src/types";
import { describe, expect, it } from "vitest";
import {
    AUDIT_ACTION_LEVEL,
    AUDIT_INFO_RETENTION_DAYS,
    auditExpiresAtFor,
    auditLevelOf,
} from "@/(shared)/lib/audit-level";

const INFO_ACTIONS = [
    AuditAction.ACCOUNT_SIGN_UP,
    AuditAction.ACCOUNT_EMAIL_VERIFY,
    AuditAction.ACCOUNT_ONBOARDING_COMPLETE,
    AuditAction.SUBSCRIPTION_ACTIVATE,
    AuditAction.SUBSCRIPTION_PLAN_CHANGE,
    AuditAction.SUBSCRIPTION_CANCELLATION_SCHEDULE,
    AuditAction.SUBSCRIPTION_END,
];

/** The 18 actions recorded before levels existed, plus `user.create`. */
const SENSITIVE_ACTION_COUNT = 19;
const DAYS_IN_A_NON_LEAP_YEAR = 365;

const ALL_ACTIONS = Object.values(AuditAction);
const SENSITIVE_ACTIONS = ALL_ACTIONS.filter(
    (action) => !INFO_ACTIONS.includes(action)
);

describe("auditLevelOf", () => {
    it("has a level for every action", () => {
        expect(Object.keys(AUDIT_ACTION_LEVEL).sort()).toEqual(
            [...ALL_ACTIONS].sort()
        );
    });

    it("keeps the 18 pre-existing actions and user.create sensitive", () => {
        expect(SENSITIVE_ACTIONS).toHaveLength(SENSITIVE_ACTION_COUNT);
        expect(SENSITIVE_ACTIONS).toContain(AuditAction.USER_CREATE);
        for (const action of SENSITIVE_ACTIONS) {
            expect(auditLevelOf(action)).toBe(AuditLevel.SENSITIVE);
        }
    });

    it("marks the seven account lifecycle actions as info", () => {
        for (const action of INFO_ACTIONS) {
            expect(auditLevelOf(action)).toBe(AuditLevel.INFO);
        }
    });
});

describe("auditExpiresAtFor", () => {
    const NOW = new Date("2026-11-26T12:00:00.000Z");

    it("expires an info event after the retention period", () => {
        expect(AUDIT_INFO_RETENTION_DAYS).toBe(DAYS_IN_A_NON_LEAP_YEAR);
        expect(auditExpiresAtFor(AuditLevel.INFO, NOW)?.toISOString()).toBe(
            "2027-11-26T12:00:00.000Z"
        );
    });

    it("never expires a sensitive event", () => {
        expect(auditExpiresAtFor(AuditLevel.SENSITIVE, NOW)).toBeNull();
    });
});
