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
    photo: string | null;
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
