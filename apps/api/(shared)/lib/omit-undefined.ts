/**
 * Builds a patch object for partial updates: drops keys whose value is `undefined`
 * so Firestore / merge layers do not overwrite existing fields with `undefined`.
 */
export function omitUndefined<T extends Record<string, unknown>>(
    object: T
): { [K in keyof T]?: T[K] } {
    return Object.fromEntries(
        Object.entries(object).filter(([, value]) => value !== undefined)
    ) as { [K in keyof T]?: T[K] };
}
