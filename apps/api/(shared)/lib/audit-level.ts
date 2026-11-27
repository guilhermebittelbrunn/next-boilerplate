import { AuditAction, AuditLevel } from "@repo/sdk/src/types";

export const AUDIT_INFO_RETENTION_DAYS = 365;
const MS_PER_DAY = 86_400_000;

/**
 * An `info` event records a fact that already happened to the account, once per occurrence,
 * never once per request: per-request events would bury the sensitive ones and eat the
 * daily write quota. Typed over the whole enum so a new action without a level fails
 * the typecheck.
 */
export const AUDIT_ACTION_LEVEL: Record<AuditAction, AuditLevel> = {
    [AuditAction.IMPERSONATION_SESSION]: AuditLevel.SENSITIVE,
    [AuditAction.USER_UPDATE]: AuditLevel.SENSITIVE,
    [AuditAction.USER_DELETE]: AuditLevel.SENSITIVE,
    [AuditAction.USER_CREATE]: AuditLevel.SENSITIVE,
    [AuditAction.ACCOUNT_SESSIONS_REVOKE]: AuditLevel.SENSITIVE,
    [AuditAction.ACCOUNT_SESSION_REVOKE]: AuditLevel.SENSITIVE,
    [AuditAction.ACCOUNT_SESSIONS_REVOKE_OTHERS]: AuditLevel.SENSITIVE,
    [AuditAction.ACCOUNT_PASSWORD_CHANGE]: AuditLevel.SENSITIVE,
    [AuditAction.ACCOUNT_EMAIL_CHANGE]: AuditLevel.SENSITIVE,
    [AuditAction.ACCOUNT_DATA_EXPORT]: AuditLevel.SENSITIVE,
    [AuditAction.ACCOUNT_DELETE]: AuditLevel.SENSITIVE,
    [AuditAction.ACCOUNT_PASSWORD_SET]: AuditLevel.SENSITIVE,
    [AuditAction.ACCOUNT_SIGN_IN_METHOD_LINK]: AuditLevel.SENSITIVE,
    [AuditAction.ACCOUNT_SIGN_IN_METHOD_UNLINK]: AuditLevel.SENSITIVE,
    [AuditAction.ORGANIZATION_OWNERSHIP_TRANSFER]: AuditLevel.SENSITIVE,
    [AuditAction.ORGANIZATION_INVITATION_SEND]: AuditLevel.SENSITIVE,
    [AuditAction.ORGANIZATION_INVITATION_ACCEPT]: AuditLevel.SENSITIVE,
    [AuditAction.ORGANIZATION_MEMBER_REMOVE]: AuditLevel.SENSITIVE,
    [AuditAction.ORGANIZATION_MEMBER_LEAVE]: AuditLevel.SENSITIVE,
    [AuditAction.ACCOUNT_SIGN_UP]: AuditLevel.INFO,
    [AuditAction.ACCOUNT_EMAIL_VERIFY]: AuditLevel.INFO,
    [AuditAction.ACCOUNT_ONBOARDING_COMPLETE]: AuditLevel.INFO,
    [AuditAction.SUBSCRIPTION_ACTIVATE]: AuditLevel.INFO,
    [AuditAction.SUBSCRIPTION_PLAN_CHANGE]: AuditLevel.INFO,
    [AuditAction.SUBSCRIPTION_CANCELLATION_SCHEDULE]: AuditLevel.INFO,
    [AuditAction.SUBSCRIPTION_END]: AuditLevel.INFO,
};

export function auditLevelOf(action: AuditAction): AuditLevel {
    return AUDIT_ACTION_LEVEL[action];
}

/**
 * Only `info` events expire. The Firestore TTL policy on `expiresAt` skips documents
 * without the field, so sensitive events stay out of it even with the policy enabled.
 */
export function auditExpiresAtFor(level: AuditLevel, now: Date): Date | null {
    if (level !== AuditLevel.INFO) {
        return null;
    }
    return new Date(now.getTime() + AUDIT_INFO_RETENTION_DAYS * MS_PER_DAY);
}
