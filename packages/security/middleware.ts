import { defaults, nosecone, type Options } from "@nosecone/next";
import type { Source } from "nosecone";

// biome-ignore lint/performance/noBarrelFile: "re-exporting"
export { createMiddleware as securityMiddleware } from "@nosecone/next";

const SELF = "'self'";
const NONE = "'none'";
const UNSAFE_INLINE = "'unsafe-inline'";
const UNSAFE_EVAL = "'unsafe-eval'";
const DATA_SCHEME = "data:";
const BLOB_SCHEME = "blob:";

/** Hosts the Firebase popup sign-in loads its bridge script and iframe from. */
const GOOGLE_APIS_ORIGIN = "https://apis.google.com";

const CSP_HEADER = "content-security-policy";
const CSP_REPORT_ONLY_HEADER = "content-security-policy-report-only";

export type SecurityHeadersInput = {
    /** Extra origins per directive, resolved from each app's environment. */
    scriptSrc?: string[];
    connectSrc?: string[];
    imgSrc?: string[];
    frameSrc?: string[];
};

const isDevelopment = (): boolean => process.env.NODE_ENV === "development";

function toSources(values: string[]): Source[] {
    return Array.from(new Set(values.filter(Boolean))) as Source[];
}

/** An empty directive is invalid; `'none'` is how CSP spells "nothing allowed". */
function toSourcesOrNone(values: string[]): Source[] {
    const sources = toSources(values);
    return sources.length > 0 ? sources : ([NONE] as Source[]);
}

/**
 * Next.js compiles with `eval` while hot reloading, so a development server whose
 * script policy forbids it renders a blank page.
 */
function developmentScriptSources(): string[] {
    return isDevelopment() ? [UNSAFE_EVAL] : [];
}

/**
 * Firebase resolves the Google sign-in popup through `window.opener`, which the
 * `same-origin` opener policy severs, and serves profile pictures from an origin
 * that sends no CORP header, which `require-corp` would refuse. Both defaults
 * break signed-in browsing, so the browser baseline relaxes exactly those two.
 */
const browserAppBase = {
    ...defaults,
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginEmbedderPolicy: false,
} satisfies Options;

export function buildBrowserAppOptions(
    input: SecurityHeadersInput = {}
): Options {
    const frameSources = toSourcesOrNone(input.frameSrc ?? []);

    return {
        ...browserAppBase,
        contentSecurityPolicy: {
            directives: {
                defaultSrc: [SELF],
                baseUri: [NONE],
                objectSrc: [NONE],
                formAction: [SELF],
                frameAncestors: [NONE],
                manifestSrc: [SELF],
                mediaSrc: [SELF],
                workerSrc: [SELF, BLOB_SCHEME],
                fontSrc: [SELF],
                // Every inline script in the tree — the theme anti-flash snippet, the
                // App Router hydration bootstrap, the analytics tag — is emitted
                // without a nonce. Declaring one here would make browsers ignore
                // `'unsafe-inline'` and leave the page unhydrated.
                scriptSrc: toSources([
                    SELF,
                    UNSAFE_INLINE,
                    GOOGLE_APIS_ORIGIN,
                    ...developmentScriptSources(),
                    ...(input.scriptSrc ?? []),
                ]),
                // antd's CSS-in-JS, the theme provider and the toast library all write
                // inline style attributes; there is no nonce-free way around it.
                styleSrc: [SELF, UNSAFE_INLINE],
                connectSrc: toSources([SELF, ...(input.connectSrc ?? [])]),
                imgSrc: toSources([
                    SELF,
                    DATA_SCHEME,
                    BLOB_SCHEME,
                    ...(input.imgSrc ?? []),
                ]),
                frameSrc: frameSources,
                childSrc: frameSources,
            },
        },
    };
}

/**
 * The API answers JSON. The only markup it ever serves is the Next error page,
 * which needs its own inline script and style to render instead of a blank tab.
 */
export function buildApiOptions(): Options {
    return {
        ...defaults,
        crossOriginEmbedderPolicy: false,
        // The API exists to be called from the front-end origins; access control is
        // the CORS allowlist and the route guards, not this header, which would
        // otherwise refuse legitimate no-cors reads of its own assets.
        crossOriginResourcePolicy: { policy: "cross-origin" },
        contentSecurityPolicy: {
            directives: {
                defaultSrc: [NONE],
                baseUri: [NONE],
                objectSrc: [NONE],
                formAction: [NONE],
                frameAncestors: [NONE],
                frameSrc: [NONE],
                childSrc: [NONE],
                connectSrc: [NONE],
                fontSrc: [SELF],
                imgSrc: [SELF, DATA_SCHEME],
                scriptSrc: toSources([
                    SELF,
                    UNSAFE_INLINE,
                    ...developmentScriptSources(),
                ]),
                styleSrc: [SELF, UNSAFE_INLINE],
            },
        },
    };
}

/**
 * Merges the computed headers into a response the caller already owns, instead of
 * `createMiddleware`, which produces the whole response and cannot coexist with
 * the locale, session and CORS decisions each proxy already makes.
 */
export function applySecurityHeaders<T extends Response>(
    response: T,
    options: Options,
    reportOnly = false
): T {
    const headers = nosecone(options);

    for (const [name, value] of headers.entries()) {
        const headerName =
            reportOnly && name === CSP_HEADER ? CSP_REPORT_ONLY_HEADER : name;
        response.headers.set(headerName, value);
    }

    return response;
}
