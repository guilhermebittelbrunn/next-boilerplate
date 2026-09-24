/** biome-ignore-all lint/style/noEnum: stable string union for API */
export enum AuditAction {
    IMPERSONATION_SESSION = "impersonation.session",
    USER_UPDATE = "user.update",
    USER_DELETE = "user.delete",
    ACCOUNT_SESSIONS_REVOKE = "account.sessions.revoke",
    ACCOUNT_PASSWORD_CHANGE = "account.password.change",
    ACCOUNT_DATA_EXPORT = "account.data.export",
    ACCOUNT_DELETE = "account.delete",
}

export enum AuditTargetType {
    USER = "user",
    ACCOUNT = "account",
    SESSION = "session",
}

export type AuditEventDTO = {
    id: string;
    action: AuditAction;
    /** Firestore document id of the profile that acted. */
    actorUserId: string;
    actorUid: string;
    /** Email or name as it stood when the event happened, so the trail survives a deletion. */
    actorLabel: string | null;
    /** Whose account the actor was operating on. Only impersonation fills it. */
    onBehalfOfUserId: string | null;
    targetType: AuditTargetType;
    targetUserId: string | null;
    targetLabel: string | null;
    /** Field names only — never the values that changed. */
    changedFields: string[];
    /** Actor, target and subject merged, which is what the user filter matches against. */
    involvedUserIds: string[];
    requestId: string | null;
    /** End of the impersonation window this event stands for. `null` on every other action. */
    windowEndsAt: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
};

export type AuditEventListQuery = {
    /** Profile document id. Matches the actor, the target or the subject of the event. */
    userId?: string;
    /** `YYYY-MM-DD`, inclusive, read as UTC. */
    from?: string;
    /** `YYYY-MM-DD`, inclusive through the end of the day, read as UTC. */
    to?: string;
};
