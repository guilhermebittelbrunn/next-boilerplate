/** biome-ignore-all lint/suspicious/noDocumentCookie: a Cookie Store API sugerida pela regra não existe no Safari, e estes cookies precisam ser lidos pelo servidor em todo navegador suportado. */
export const setCookie = (name: string, value: string, expiresIn: number) => {
    if (typeof window === "undefined") {
        return;
    }

    const expires = new Date();
    const ms = 1000;
    expires.setTime(expires.getTime() + expiresIn * ms);

    // Usar SameSite=Lax para permitir cookies em redirecionamentos externos (ex: Stripe)
    // Lax permite cookies em navegação top-level (como retorno do Stripe)
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
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
