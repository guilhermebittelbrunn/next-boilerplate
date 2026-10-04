import { createSessionAuthority } from "@repo/sdk/src/client/sessionAuthority";

/** Imported only by route handlers and the proxy: it runs on the front-end server. */
export const sessionAuthority = createSessionAuthority(
    process.env.NEXT_PUBLIC_API_URL,
    "app"
);
