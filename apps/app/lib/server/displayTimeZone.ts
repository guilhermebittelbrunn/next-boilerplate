import { cookies } from "next/headers";
import {
    resolveDisplayTimeZone,
    TIME_ZONE_COOKIE,
} from "@/shared/lib/displayTimeZone";

/** The browser's zone as a previous visit stored it, or `undefined` on a first visit. */
export async function resolvePreferredTimeZone(): Promise<string | undefined> {
    const cookieStore = await cookies();
    return resolveDisplayTimeZone(cookieStore.get(TIME_ZONE_COOKIE)?.value);
}
