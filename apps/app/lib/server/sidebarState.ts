import { SIDEBAR_COOKIE_NAME } from "@repo/design-system/components/ui/sidebar";
import { cookies } from "next/headers";

/**
 * Whether the sidebar should render open on the first paint.
 *
 * The toggle persists in a cookie, so the server has to read it and pass it down as
 * `defaultOpen`. Letting the client discover it on its own means the server renders the
 * default while the client renders the stored value — the sidebar flashes open and snaps
 * back, and React reports a hydration mismatch.
 */
export async function resolveSidebarDefaultOpen(): Promise<boolean> {
    const cookieStore = await cookies();
    const persisted = cookieStore.get(SIDEBAR_COOKIE_NAME)?.value;
    return persisted === undefined ? true : persisted === "true";
}
