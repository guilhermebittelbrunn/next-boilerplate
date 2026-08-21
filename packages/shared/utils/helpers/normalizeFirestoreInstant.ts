/**
 * Converts Firestore-like instants (`Timestamp` duck-typed with `toDate`, `Date`, ISO `string`)
 * to an ISO string. Unknown values fall back to epoch (same behaviour as the API mapper).
 */
export function normalizeFirestoreInstant(value: unknown): string {
    if (value == null) {
        return new Date(0).toISOString();
    }
    if (typeof value === "string") {
        return value;
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    const maybe = value as { toDate?: () => Date };
    if (typeof maybe.toDate === "function") {
        return maybe.toDate().toISOString();
    }
    return new Date(0).toISOString();
}
