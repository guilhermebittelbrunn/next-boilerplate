import { cookies } from "next/headers";

/**
 * ID token from `Authorization: Bearer` or httpOnly `access-token` cookie.
 */
export async function resolveSessionToken(
    request: Request
): Promise<string | null> {
    const auth = request.headers.get("authorization");
    if (auth?.startsWith("Bearer ")) {
        return auth.slice("Bearer ".length).trim() || null;
    }
    const cookieStore = await cookies();
    return cookieStore.get("access-token")?.value ?? null;
}
