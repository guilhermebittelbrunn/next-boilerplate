/** gRPC ALREADY_EXISTS, the status Firestore uses when `create()` hits a taken id. */
const ALREADY_EXISTS = 6;

export function isAlreadyExistsError(error: unknown): boolean {
    return (error as { code?: unknown } | null)?.code === ALREADY_EXISTS;
}
