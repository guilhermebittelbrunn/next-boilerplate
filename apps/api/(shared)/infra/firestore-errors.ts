/** gRPC ALREADY_EXISTS, the status Firestore uses when `create()` hits a taken id. */
const ALREADY_EXISTS = 6;
/** gRPC NOT_FOUND, the status Firestore uses when `update()` targets a missing document. */
const NOT_FOUND = 5;

export function isAlreadyExistsError(error: unknown): boolean {
    return (error as { code?: unknown } | null)?.code === ALREADY_EXISTS;
}

export function isNotFoundError(error: unknown): boolean {
    return (error as { code?: unknown } | null)?.code === NOT_FOUND;
}
