/**
 * Normalizes optional string-ish fields: `null` / `undefined` / empty / whitespace-only → `null`;
 * otherwise returns a trimmed string.
 */
export function stringIfExists(value: unknown): string | null {
    if (value == null) {
        return null;
    }
    const s = String(value).trim();
    return s === "" ? null : s;
}
