export type PageDTO<T> = {
    items: T[];
    /** Opaque: hand it back exactly as received. `null` when there is no next page. */
    nextCursor: string | null;
};

export type PageQuery = {
    limit?: number;
    cursor?: string | null;
};
