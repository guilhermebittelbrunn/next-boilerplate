"use client";

import { getCookie, setCookie } from "@repo/shared/utils";
import { resolveBrowserTimeZone } from "@repo/shared/utils/helpers/auth-request-headers";
import {
    createContext,
    type ReactNode,
    useContext,
    useEffect,
    useState,
} from "react";
import {
    FALLBACK_DISPLAY_TIME_ZONE,
    resolveDisplayTimeZone,
    TIME_ZONE_COOKIE,
} from "@/shared/lib/displayTimeZone";
import { PREFERENCE_COOKIE_TTL_SECONDS } from "@/shared/lib/themePreference";

const DisplayTimeZoneContext = createContext<string | undefined>(undefined);

/**
 * Starts from the zone the server rendered with, so hydration prints the same dates, and
 * only then moves to the browser's zone. The cookie lets the next server render start
 * from the browser's zone directly.
 */
export function DisplayTimeZoneProvider({
    children,
    initialTimeZone,
}: {
    children: ReactNode;
    initialTimeZone?: string;
}) {
    const [timeZone, setTimeZone] = useState(
        initialTimeZone ?? FALLBACK_DISPLAY_TIME_ZONE
    );

    useEffect(() => {
        const browserTimeZone = resolveDisplayTimeZone(
            resolveBrowserTimeZone()
        );
        if (!browserTimeZone) {
            return;
        }
        setTimeZone(browserTimeZone);
        if (getCookie(TIME_ZONE_COOKIE) !== browserTimeZone) {
            setCookie(
                TIME_ZONE_COOKIE,
                browserTimeZone,
                PREFERENCE_COOKIE_TTL_SECONDS
            );
        }
    }, []);

    return (
        <DisplayTimeZoneContext.Provider value={timeZone}>
            {children}
        </DisplayTimeZoneContext.Provider>
    );
}

/** `undefined` outside the provider, which leaves formatting to the runtime's zone. */
export function useDisplayTimeZone(): string | undefined {
    return useContext(DisplayTimeZoneContext);
}
