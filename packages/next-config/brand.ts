/**
 * Product identity a fork sets once, through public env vars inlined at build, so
 * the same values reach the app, the landing, the metadata and the emails. Every
 * field falls back to a neutral default: a fork that sets nothing still builds.
 */
export type Brand = {
    readonly name: string;
    readonly isDefaultName: boolean;
    readonly logoUrl: string | null;
    readonly supportEmail: string | null;
    readonly siteUrl: string | null;
};

export const DEFAULT_BRAND_NAME = "next-boilerplate";

const TRAILING_SLASH_RE = /\/+$/;
const PROTOCOL_RE = /^https?:\/\//;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// The URL parser keeps `;`, `,` and quotes in a host, and the logo origin is written
// verbatim into the CSP header, where a `;` would open a directive of its own.
const PLAIN_HOST_RE = /^(?:[a-z0-9-]+\.)*[a-z0-9-]+$|^\[[0-9a-f:.]+\]$/;

/** Absolute http(s) only: email clients cannot resolve a relative path, and any other scheme is not an image. */
const toHttpUrl = (value: string | undefined): string | null => {
    const trimmed = value?.trim();
    if (!trimmed) {
        return null;
    }
    try {
        const url = new URL(trimmed);
        const isHttp = url.protocol === "https:" || url.protocol === "http:";
        return isHttp && PLAIN_HOST_RE.test(url.hostname) ? url.href : null;
    } catch {
        return null;
    }
};

const toEmail = (value: string | undefined): string | null => {
    const trimmed = value?.trim();
    return trimmed && EMAIL_RE.test(trimmed) ? trimmed : null;
};

const toOrigin = (value: string | undefined): string | null => {
    const trimmed = value?.trim().replace(TRAILING_SLASH_RE, "");
    if (!trimmed) {
        return null;
    }
    return PROTOCOL_RE.test(trimmed) ? trimmed : `https://${trimmed}`;
};

export function getBrand(): Brand {
    const configuredName = process.env.NEXT_PUBLIC_APP_NAME?.trim();
    return {
        name: configuredName || DEFAULT_BRAND_NAME,
        isDefaultName: !configuredName,
        logoUrl: toHttpUrl(process.env.NEXT_PUBLIC_APP_LOGO_URL),
        supportEmail: toEmail(process.env.NEXT_PUBLIC_APP_SUPPORT_EMAIL),
        siteUrl: toOrigin(process.env.NEXT_PUBLIC_WEB_URL),
    };
}

export function getBrandLogoOrigin(): string | null {
    const { logoUrl } = getBrand();
    return logoUrl ? new URL(logoUrl).origin : null;
}
