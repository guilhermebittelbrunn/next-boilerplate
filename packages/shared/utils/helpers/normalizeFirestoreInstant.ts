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

/** A readable instant as a `Date`, or `null` when the value is absent or cannot be read as one. */
export function readFirestoreInstant(value: unknown): Date | null {
    let candidate: unknown = null;
    if (value instanceof Date) {
        candidate = value;
    } else if (typeof value === "string") {
        candidate = new Date(value);
    } else if (
        typeof (value as { toDate?: unknown } | null | undefined)?.toDate ===
        "function"
    ) {
        candidate = (value as { toDate: () => unknown }).toDate();
    }
    return candidate instanceof Date && !Number.isNaN(candidate.getTime())
        ? candidate
        : null;
}
