export type UserType = "admin" | "common";

export type UserDTO = {
    id: string;
    type: UserType;
    reference_id: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
};
