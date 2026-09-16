import "server-only";
import { cookies } from "next/headers";
import {
    CONSENT_COOKIE_NAME,
    type ConsentBootstrap,
    parseConsent,
    resolveConsentable,
} from "./consent";
import { keys } from "./keys";

/**
 * Resolvido no servidor e passado como prop: ler o cookie dentro de um componente
 * cliente faz o primeiro render divergir do HTML e o banner piscar para quem já respondeu.
 */
export async function resolveConsentBootstrap(): Promise<ConsentBootstrap> {
    const cookieStore = await cookies();
    // `keys()` já descarta string vazia e id sem prefixo `G-`, ao contrário de `process.env`.
    const gaMeasurementId = keys().NEXT_PUBLIC_GA_MEASUREMENT_ID ?? null;

    return {
        snapshot: parseConsent(cookieStore.get(CONSENT_COOKIE_NAME)?.value),
        consentable: resolveConsentable({
            gaMeasurementId,
            vercelEnv: process.env.VERCEL_ENV,
        }),
        gaMeasurementId,
        cookieDomain: process.env.SESSION_COOKIE_DOMAIN?.trim() || null,
        secure: process.env.NODE_ENV === "production",
    };
}
