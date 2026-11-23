/** The `error.code` the API answered with, read off the response the SDK let through. */
export function apiErrorCodeOf(error: unknown): string | null {
    const code = (
        error as {
            response?: { data?: { error?: { code?: unknown } } };
        } | null
    )?.response?.data?.error?.code;
    return typeof code === "string" ? code : null;
}
