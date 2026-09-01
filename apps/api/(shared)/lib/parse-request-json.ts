/**
 * Parses JSON body for POST/PUT handlers; returns a consistent 400 on invalid JSON.
 */
export async function parseRequestJson(
    req: Request
): Promise<{ ok: true; value: unknown } | { ok: false; response: Response }> {
    try {
        return { ok: true, value: await req.json() };
    } catch {
        return {
            ok: false,
            response: Response.json(
                { error: { code: "VALIDATION_FAILED" } },
                { status: 400 }
            ),
        };
    }
}
