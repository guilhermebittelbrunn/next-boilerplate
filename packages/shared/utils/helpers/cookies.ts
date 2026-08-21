/** biome-ignore-all lint/suspicious/noDocumentCookie: <explanation> */
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

    // biome-ignore lint/style/useForOf: <explanation>
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === " ") {
            c = c.substring(1, c.length);
        }
        if (c.indexOf(nameEQ) === 0) {
            return c.substring(nameEQ.length, c.length);
        }
    }

    return null;
};

export const removeCookie = (name: string) => {
    if (typeof window === "undefined") {
        return;
    }

    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
};
