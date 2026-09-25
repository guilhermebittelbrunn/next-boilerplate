import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CookieConsent } from "@repo/design-system/components/ui/cookie-consent";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const layoutSource = readFileSync(
    join(__dirname, "../app/[locale]/(unauthenticated)/layout.tsx"),
    "utf8"
);

/**
 * A página de autenticação reserva espaço embaixo enquanto o banner estiver no documento,
 * por um seletor `body:has(...)`. Renomear o atributo de um lado sem o outro devolve o
 * formulário para baixo do banner, e nada no build acusa.
 */
const CONDITIONAL_OFFSET =
    /\[body:has\((?<selector>[^)]+)\)_&\]:(?<utility>[\w-]+)/;
const FULL_VIEWPORT_HEIGHT = /(?<![\w-])h-dvh/;

const bannerSelectorInLayout = layoutSource.match(CONDITIONAL_OFFSET)?.groups;

const ignore = vi.fn();

function renderBanner(bannerOpen: boolean) {
    return render(
        <CookieConsent
            analyticsGranted={false}
            bannerOpen={bannerOpen}
            locale="pt-br"
            onAcceptAll={ignore}
            onPreferencesOpenChange={ignore}
            onRejectAll={ignore}
            onSave={ignore}
            preferencesOpen={false}
            privacyPolicyHref="/pt-br/legal/privacy"
        />
    );
}

afterEach(cleanup);

describe("folga da página de autenticação sob o banner de cookies", () => {
    it("mantém o seletor condicional na coluna do formulário", () => {
        expect(bannerSelectorInLayout?.selector).toBeTruthy();
        expect(bannerSelectorInLayout?.utility).toBe("pb-96");
    });

    it("casa o seletor do layout com o atributo que o banner publica", () => {
        const { container } = renderBanner(true);

        expect(
            container.querySelector(String(bannerSelectorInLayout?.selector))
        ).not.toBeNull();
    });

    it("não reserva a folga quando o visitante já respondeu", () => {
        const { container } = renderBanner(false);

        expect(
            container.querySelector(String(bannerSelectorInLayout?.selector))
        ).toBeNull();
    });

    it("deixa a página de autenticação crescer além da altura da janela", () => {
        expect(layoutSource).toContain("min-h-dvh");
        expect(layoutSource).not.toMatch(FULL_VIEWPORT_HEIGHT);
    });
});
