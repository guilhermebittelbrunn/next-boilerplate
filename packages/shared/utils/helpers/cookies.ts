/** biome-ignore-all lint/suspicious/noDocumentCookie: a Cookie Store API sugerida pela regra não existe no Safari, e estes cookies precisam ser lidos pelo servidor em todo navegador suportado. */
export type SetCookieOptions = {
    /** Registrable parent domain, so the cookie is shared between subdomains. */
    domain?: string;
    secure?: boolean;
};

const PREFERENCE_COOKIE_MAX_AGE_DAYS = 180;
const SECONDS_PER_DAY = 86_400;
export const PREFERENCE_COOKIE_MAX_AGE_SECONDS =
    PREFERENCE_COOKIE_MAX_AGE_DAYS * SECONDS_PER_DAY;

export const isHttpsPage = (): boolean =>
    typeof window !== "undefined" && window.location?.protocol === "https:";

/** Attributes for a preference cookie written by the server (`cookies().set`). */
export const preferenceCookieOptions = (protocol: string) => ({
    path: "/",
    sameSite: "lax" as const,
    maxAge: PREFERENCE_COOKIE_MAX_AGE_SECONDS,
    secure: protocol === "https:",
});

export const setCookie = (
    name: string,
    value: string,
    expiresIn: number,
    options?: SetCookieOptions
) => {
    if (typeof window === "undefined") {
        return;
    }

    const secure = options?.secure ?? isHttpsPage();
    const expires = new Date();
    const ms = 1000;
    expires.setTime(expires.getTime() + expiresIn * ms);

    // Usar SameSite=Lax para permitir cookies em redirecionamentos externos (ex: Stripe)
    // Lax permite cookies em navegação top-level (como retorno do Stripe)
    document.cookie = [
        `${name}=${value}`,
        `expires=${expires.toUTCString()}`,
        "path=/",
        "SameSite=Lax",
        ...(options?.domain ? [`domain=${options.domain}`] : []),
        ...(secure ? ["Secure"] : []),
    ].join(";");
};

export const getCookie = (name: string): string | null => {
    if (typeof window === "undefined") {
        return null;
    }

    const nameEQ = `${name}=`;
    const ca = document.cookie.split(";");

    const entry = ca
        .map((part) => part.trimStart())
        .find((part) => part.startsWith(nameEQ));

    return entry ? entry.slice(nameEQ.length) : null;
};

export const removeCookie = (name: string) => {
    if (typeof window === "undefined") {
        return;
    }

    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
};
