"use client";

import { logout } from "@repo/auth/client";
import useAuth from "@repo/auth/provider";
import { getDictionary } from "@repo/internationalization/client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { resolveAppPostLoginPath } from "@/shared/lib/postLoginNavigation";

async function writeSessionCookie(idToken: string): Promise<boolean> {
    const response = await fetch("/api/auth/session", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
    }).catch(() => null);
    return response?.ok === true;
}

async function establishSession(user: {
    getIdToken: () => Promise<string>;
}): Promise<string | null> {
    const token = await user.getIdToken().catch(() => null);
    if (!token) {
        return null;
    }
    return (await writeSessionCookie(token)) ? token : null;
}

/**
 * Sends a visitor who is already signed in on the client to the panel, but only once the
 * session cookie is written: the proxy bounces any destination that arrives without it
 * back to this screen. Without the cookie the client is signed out so the form shows.
 */
export function useSignedInRedirect(): void {
    const { user, loading } = useAuth();
    const { locale } = getDictionary();
    const queryClient = useQueryClient();

    useEffect(() => {
        // A sign-in started on this screen writes the cookie and navigates on its own, or
        // signs the client out when the write fails. Racing it with a second write could
        // sign out a client user it is about to carry into the panel.
        if (loading || !user || queryClient.isMutating() > 0) {
            return;
        }
        let cancelled = false;
        (async () => {
            const token = await establishSession(user);
            if (cancelled) {
                return;
            }
            if (!token) {
                await logout().catch(() => null);
                return;
            }
            const path = await resolveAppPostLoginPath({
                idToken: token,
                locale,
                fallbackPath: `/${locale}`,
            });
            if (!cancelled) {
                window.location.replace(path);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [user, loading, locale, queryClient]);
}
