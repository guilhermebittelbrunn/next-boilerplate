import { describe, expect, it } from "vitest";
import { globalTranslations } from "../translations/global";
import { sharedUtilsTranslations } from "../translations/packages/shared/utils";

/**
 * Paridade de traduções: cada idioma deve ter EXATAMENTE o mesmo conjunto de
 * chaves (recursivamente). Pega chave esquecida em pt-br/en/es e em apiErrors.
 *
 * Usado pela skill /i18n-sync. Roda em `pnpm test` (turbo) e em CI.
 */

type ByLocale = Record<"pt-br" | "en" | "es", unknown>;

/** Coleta todos os caminhos de chave folha de um objeto (ex.: "a.b.c"). */
function keyPaths(value: unknown, prefix = ""): string[] {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        return Object.entries(value as Record<string, unknown>).flatMap(
            ([key, child]) => keyPaths(child, prefix ? `${prefix}.${key}` : key)
        );
    }
    return [prefix];
}

/** Chaves presentes em `a` e ausentes em `b`. */
function missingFrom(a: string[], b: string[]): string[] {
    const setB = new Set(b);
    return a.filter((key) => !setB.has(key));
}

/** Lista de divergências em relação a pt-br; vazio = paridade perfeita. */
function parityProblems(label: string, byLocale: ByLocale): string[] {
    const reference = keyPaths(byLocale["pt-br"]);
    const problems: string[] = [];

    for (const locale of ["en", "es"] as const) {
        const here = keyPaths(byLocale[locale]);
        for (const key of missingFrom(reference, here)) {
            problems.push(`[${label}] ${locale} faltando: ${key}`);
        }
        for (const key of missingFrom(here, reference)) {
            problems.push(`[${label}] ${locale} sobrando: ${key}`);
        }
    }

    return problems.sort();
}

describe("i18n parity (pt-br / en / es)", () => {
    it("globalTranslations tem as mesmas chaves nos 3 idiomas", () => {
        expect(
            parityProblems("globalTranslations", globalTranslations)
        ).toEqual([]);
    });

    it("apiErrors (FormattedError) tem as mesmas chaves nos 3 idiomas", () => {
        expect(
            parityProblems("sharedUtilsTranslations", sharedUtilsTranslations)
        ).toEqual([]);
    });
});
