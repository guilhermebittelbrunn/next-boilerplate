import type { Context } from "@repo/sdk/src/client/base";
import { Client } from "@repo/sdk/src/client/index";
import { cookies } from "next/headers";

const ACCESS_TOKEN_COOKIE = "access-token";

/**
 * Per-request, authenticated SDK client for Server Components / route handlers.
 *
 * A fresh instance per call is intentional: the client-side `apiClient` singleton
 * (`@/shared/lib/client`) must never be reused on the server, or its auth headers
 * would leak across concurrent requests. Returns `null` when there is no session
 * cookie or the API base URL is not configured.
 */
export async function getServerApiClient(
    context: Context = "common"
): Promise<Client | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
    if (!token) {
        return null;
    }

    const url = process.env.NEXT_PUBLIC_API_URL;
    if (!url) {
        return null;
    }

    const client = new Client({ url, project: "app", context });
    client.setAuthorizationHeader(token);
    return client;
}
