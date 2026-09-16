import { describe, expect, it } from "vitest";
import {
    buildConsentModeDefaultsScript,
    CONSENT_COOKIE_NAME,
    CONSENT_COOKIE_TTL_SECONDS,
    NO_CONSENT,
    parseConsent,
    resolveConsentable,
    serializeConsent,
} from "../consent";

const EXPECTED_TTL_DAYS = 180;
const SECONDS_IN_A_DAY = 86_400;

describe("serializeConsent", () => {
    it("marca a medição concedida", () => {
        expect(serializeConsent({ analytics: true })).toBe(
            "v1:analytics=granted"
        );
    });

    it("marca a medição negada", () => {
        expect(serializeConsent({ analytics: false })).toBe(
            "v1:analytics=denied"
        );
    });
});

describe("parseConsent", () => {
    it("lê de volta o que serializeConsent gravou", () => {
        for (const analytics of [true, false]) {
            expect(parseConsent(serializeConsent({ analytics }))).toEqual({
                decided: true,
                analytics,
            });
        }
    });

    it.each([
        ["ausente", undefined],
        ["nulo", null],
        ["vazio", ""],
        ["sem separador", "v1"],
        ["sem categorias", "v1:"],
        ["de versão desconhecida", "v2:analytics=granted"],
        ["sem a categoria de medição", "v1:marketing=granted"],
        ["com valor fora do vocabulário", "v1:analytics=yes"],
        ["com JSON no lugar do formato", '{"analytics":true}'],
        ["com lixo", "%%%"],
    ])("trata cookie %s como sem decisão", (_label, raw) => {
        expect(parseConsent(raw)).toEqual(NO_CONSENT);
    });

    it("ignora categoria desconhecida ao lado de uma conhecida", () => {
        expect(parseConsent("v1:marketing=granted,analytics=denied")).toEqual({
            decided: true,
            analytics: false,
        });
    });

    it("nunca lança, qualquer que seja a entrada", () => {
        const hostile = [
            "v1:analytics",
            "v1:=granted",
            "::::",
            "v1:analytics=granted=granted",
            "v1:,,,",
        ];

        for (const raw of hostile) {
            expect(() => parseConsent(raw)).not.toThrow();
        }
    });

    it("sem decisão nunca concede medição", () => {
        expect(NO_CONSENT.analytics).toBe(false);
    });
});

describe("resolveConsentable", () => {
    it("liga com uma tag do Google configurada", () => {
        expect(resolveConsentable({ gaMeasurementId: "G-ABC123" })).toBe(true);
    });

    it("desliga com id vazio", () => {
        expect(resolveConsentable({ gaMeasurementId: "" })).toBe(false);
    });

    it("desliga com id nulo", () => {
        expect(resolveConsentable({ gaMeasurementId: null })).toBe(false);
    });

    it("liga na Vercel mesmo sem tag do Google", () => {
        expect(
            resolveConsentable({
                gaMeasurementId: null,
                vercelEnv: "production",
            })
        ).toBe(true);
    });

    it("desliga sem nada configurado", () => {
        expect(resolveConsentable({})).toBe(false);
    });
});

describe("buildConsentModeDefaultsScript", () => {
    it("declara os quatro sinais do Consent Mode v2", () => {
        const script = buildConsentModeDefaultsScript(NO_CONSENT);

        for (const signal of [
            "ad_storage",
            "ad_user_data",
            "ad_personalization",
            "analytics_storage",
        ]) {
            expect(script).toContain(signal);
        }
    });

    it("nega tudo e espera pela escolha enquanto não há decisão", () => {
        const script = buildConsentModeDefaultsScript(NO_CONSENT);

        expect(script).toContain("'analytics_storage':'denied'");
        expect(script).toContain("'wait_for_update':500");
    });

    it("já nasce concedido quando a escolha veio do cookie", () => {
        const script = buildConsentModeDefaultsScript({
            decided: true,
            analytics: true,
        });

        expect(script).toContain("'analytics_storage':'granted'");
    });

    it("não espera por atualização quando a escolha já existe", () => {
        const script = buildConsentModeDefaultsScript({
            decided: true,
            analytics: true,
        });

        expect(script).not.toContain("wait_for_update");
    });

    it("mantém a medição negada quando a escolha foi recusar", () => {
        const script = buildConsentModeDefaultsScript({
            decided: true,
            analytics: false,
        });

        expect(script).toContain("'analytics_storage':'denied'");
    });

    it("nunca concede os sinais de publicidade", () => {
        const script = buildConsentModeDefaultsScript({
            decided: true,
            analytics: true,
        });

        expect(script).toContain("'ad_storage':'denied'");
        expect(script).toContain("'ad_user_data':'denied'");
        expect(script).toContain("'ad_personalization':'denied'");
    });

    it("declara a fila do dataLayer antes de usar o gtag", () => {
        const script = buildConsentModeDefaultsScript(NO_CONSENT);

        expect(script.indexOf("window.dataLayer")).toBeLessThan(
            script.indexOf("gtag('consent'")
        );
    });
});

describe("constantes do cookie", () => {
    it("usa o prefixo de namespace do repositório", () => {
        expect(CONSENT_COOKIE_NAME).toBe("bp:cookie-consent");
    });

    it("expira em 180 dias", () => {
        expect(CONSENT_COOKIE_TTL_SECONDS).toBe(
            EXPECTED_TTL_DAYS * SECONDS_IN_A_DAY
        );
    });
});
