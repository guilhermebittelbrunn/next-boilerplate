export const CONSENT_COOKIE_NAME = "bp:cookie-consent";

/**
 * O valor do cookie carrega a versão do conjunto de categorias. Quando uma categoria
 * nova entrar, subir a versão invalida a escolha antiga e o visitante é perguntado de
 * novo — consentimento dado para duas categorias não vale para três.
 */
export const CONSENT_COOKIE_VERSION = "v1";

const CONSENT_COOKIE_TTL_DAYS = 180;
const SECONDS_IN_A_DAY = 60 * 60 * 24;
export const CONSENT_COOKIE_TTL_SECONDS =
    CONSENT_COOKIE_TTL_DAYS * SECONDS_IN_A_DAY;

export type ConsentDecision = {
    analytics: boolean;
};

export type ConsentSnapshot = ConsentDecision & {
    decided: boolean;
};

export const NO_CONSENT: ConsentSnapshot = { decided: false, analytics: false };

export type ConsentBootstrap = {
    snapshot: ConsentSnapshot;
    /** Falso quando não há medição configurada: não há o que consentir. */
    consentable: boolean;
    gaMeasurementId: string | null;
    cookieDomain: string | null;
    secure: boolean;
};

export function serializeConsent(decision: ConsentDecision): string {
    const analytics = decision.analytics ? "granted" : "denied";
    return `${CONSENT_COOKIE_VERSION}:analytics=${analytics}`;
}

/** Entrada não confiável: qualquer desvio do formato vira "sem decisão", nunca exceção. */
export function parseConsent(raw: string | undefined | null): ConsentSnapshot {
    if (!raw) {
        return NO_CONSENT;
    }

    const separator = raw.indexOf(":");
    if (separator < 0) {
        return NO_CONSENT;
    }

    const version = raw.slice(0, separator);
    const entries = raw.slice(separator + 1);
    if (version !== CONSENT_COOKIE_VERSION || !entries) {
        return NO_CONSENT;
    }

    const analytics = entries
        .split(",")
        .map((pair) => pair.split("="))
        .find(([key]) => key === "analytics")?.[1];

    if (analytics !== "granted" && analytics !== "denied") {
        return NO_CONSENT;
    }

    return { decided: true, analytics: analytics === "granted" };
}

/**
 * Script inline que declara a fila do `dataLayer` e os quatro sinais do Consent Mode v2.
 * Ele precisa rodar antes de a tag carregar, e por isso é inline: um script externo
 * chegaria tarde.
 *
 * Numa visita em que a escolha já foi feita, o padrão nasce com ela — um padrão negado
 * sem `update` logo atrás faria a tag medir em modo restrito apesar do consentimento.
 * `wait_for_update` só faz sentido enquanto não há escolha.
 *
 * Os três sinais de publicidade ficam negados: o boilerplate não embarca tag de anúncio.
 */
export function buildConsentModeDefaultsScript(
    snapshot: ConsentSnapshot
): string {
    const analyticsStorage =
        snapshot.decided && snapshot.analytics ? "granted" : "denied";
    const waitForUpdate = snapshot.decided ? "" : ",'wait_for_update':500";

    return [
        "window.dataLayer=window.dataLayer||[];",
        "function gtag(){dataLayer.push(arguments);}",
        "gtag('consent','default',{",
        "'ad_storage':'denied',",
        "'ad_user_data':'denied',",
        "'ad_personalization':'denied',",
        `'analytics_storage':'${analyticsStorage}'`,
        waitForUpdate,
        "});",
    ].join("");
}

/**
 * Só faz sentido pedir consentimento quando existe alguma medição para suprimir: uma
 * tag do Google configurada, ou o Vercel Analytics, que a própria Vercel liga em runtime.
 */
export function resolveConsentable(input: {
    gaMeasurementId?: string | null;
    vercelEnv?: string | null;
}): boolean {
    return Boolean(input.gaMeasurementId) || Boolean(input.vercelEnv);
}
