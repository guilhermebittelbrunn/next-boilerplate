/** biome-ignore-all lint/style/noEnum: stable string union for API */
export enum EntityType {
    FRANCHISE = "franchise",
    CUSTOMER = "customer",
    COLLABORATOR = "collaborator",
}

export type EntityDTO = {
    id: string;
    userId: string;
    name: string;
    description: string;
    type: EntityType;
    /** Stored reference: an object path in the bucket, or an absolute external URL. */
    photo: string | null;
    /**
     * Derived by the API on read: a displayable, expiring URL when `photo` is a bucket
     * object, or `photo` itself when it already is a URL. It is never persisted, and
     * sending it on a write would store a signature that is already expiring.
     */
    photoUrl?: string | null;
    genre: string | null;
    birthdate: string | null;
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
};

export type CreateEntityRequest = {
    name: string;
    description: string;
    type: EntityType;
    photo?: string | null;
    genre?: string | null;
    birthdate?: string | null;
    enabled?: boolean;
};

export type UpdateEntityRequest = {
    name?: string;
    description?: string;
    type?: EntityType;
    photo?: string | null;
    genre?: string | null;
    birthdate?: string | null;
    enabled?: boolean;
};

/**
 * Counted server-side, one aggregation per number. `total` is its own count rather than
 * the sum of `byType`, so a record stored without a `type` still shows up in the total.
 */
export type EntitySummaryDTO = {
    total: number;
    enabled: number;
    byType: Record<EntityType, number>;
};
