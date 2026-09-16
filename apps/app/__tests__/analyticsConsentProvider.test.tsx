import type { ConsentBootstrap } from "@repo/analytics/consent";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { setCookieMock } = vi.hoisted(() => ({ setCookieMock: vi.fn() }));

vi.mock("@repo/shared/utils", async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    setCookie: setCookieMock,
}));

vi.mock("@next/third-parties/google", () => ({
    GoogleAnalytics: ({ gaId }: { gaId: string }) => (
        <div data-ga-id={gaId} data-testid="google-analytics" />
    ),
}));

vi.mock("@vercel/analytics/react", () => ({
    Analytics: () => <div data-testid="vercel-analytics" />,
}));

const { AnalyticsProvider } = await import("@repo/analytics/provider");

const MEASUREMENT_ID = "G-TEST00000";
const TTL_IN_DAYS = 180;
const SECONDS_IN_A_DAY = 86_400;
const TTL_IN_SECONDS = TTL_IN_DAYS * SECONDS_IN_A_DAY;
const CONSENT_COOKIE = "bp:cookie-consent";

const bootstrap = (overrides: Partial<ConsentBootstrap> = {}) =>
    ({
        snapshot: { decided: false, analytics: false },
        consentable: true,
        gaMeasurementId: MEASUREMENT_ID,
        cookieDomain: null,
        secure: false,
        ...overrides,
    }) satisfies ConsentBootstrap;

function renderProvider(consent: ConsentBootstrap) {
    return render(
        <AnalyticsProvider consent={consent} locale="pt-br">
            <p>conteúdo da página</p>
        </AnalyticsProvider>
    );
}

function consentModeScript(container: HTMLElement) {
    return Array.from(container.querySelectorAll("script")).find((script) =>
        script.innerHTML.includes("gtag('consent','default'")
    );
}

/** A ordem no `dataLayer` é a ordem em que os nós aparecem no documento. */
function documentOrderOf(container: HTMLElement, node: Element | undefined) {
    return Array.from(container.querySelectorAll("*")).indexOf(node as Element);
}

let gtag: ReturnType<typeof vi.fn>;

beforeEach(() => {
    vi.clearAllMocks();
    gtag = vi.fn();
    (window as unknown as { gtag: unknown }).gtag = gtag;
});

afterEach(cleanup);

describe("AnalyticsProvider — carregamento das tags", () => {
    it("não carrega tag nenhuma enquanto o visitante não decide", () => {
        renderProvider(bootstrap());

        expect(screen.queryByTestId("google-analytics")).toBeNull();
        expect(screen.queryByTestId("vercel-analytics")).toBeNull();
        expect(screen.getByText("Cookies neste site")).toBeTruthy();
    });

    it("não carrega tag nenhuma depois de uma recusa gravada", () => {
        renderProvider(
            bootstrap({ snapshot: { decided: true, analytics: false } })
        );

        expect(screen.queryByTestId("google-analytics")).toBeNull();
        expect(screen.queryByTestId("vercel-analytics")).toBeNull();
        expect(screen.queryByText("Cookies neste site")).toBeNull();
    });

    it("carrega as tags quando o consentimento veio do cookie", () => {
        renderProvider(
            bootstrap({ snapshot: { decided: true, analytics: true } })
        );

        expect(
            screen.getByTestId("google-analytics").getAttribute("data-ga-id")
        ).toBe(MEASUREMENT_ID);
        expect(screen.getByTestId("vercel-analytics")).toBeTruthy();
    });
});

describe("AnalyticsProvider — Consent Mode", () => {
    it("empilha os padrões antes de a tag do Google entrar na árvore", () => {
        const { container } = renderProvider(
            bootstrap({ snapshot: { decided: true, analytics: true } })
        );

        const script = consentModeScript(container);
        const googleAnalytics = screen.getByTestId("google-analytics");

        expect(script).toBeTruthy();
        expect(documentOrderOf(container, script)).toBeLessThan(
            documentOrderOf(container, googleAnalytics)
        );
    });

    it("nega a medição e espera pela escolha na primeira visita", () => {
        const { container } = renderProvider(bootstrap());

        expect(consentModeScript(container)?.innerHTML).toContain(
            "'analytics_storage':'denied'"
        );
        expect(consentModeScript(container)?.innerHTML).toContain(
            "wait_for_update"
        );
    });

    it("nasce concedido e sem espera quando a escolha já existe", () => {
        const { container } = renderProvider(
            bootstrap({ snapshot: { decided: true, analytics: true } })
        );

        expect(consentModeScript(container)?.innerHTML).toContain(
            "'analytics_storage':'granted'"
        );
        expect(consentModeScript(container)?.innerHTML).not.toContain(
            "wait_for_update"
        );
    });
});

describe("AnalyticsProvider — decisão pelo banner", () => {
    it("grava a recusa por 180 dias e avisa o gtag", () => {
        renderProvider(bootstrap());

        fireEvent.click(screen.getByText("Recusar tudo"));

        expect(setCookieMock).toHaveBeenCalledWith(
            CONSENT_COOKIE,
            "v1:analytics=denied",
            TTL_IN_SECONDS,
            { domain: undefined, secure: false }
        );
        expect(gtag).toHaveBeenCalledWith(
            "consent",
            "update",
            expect.objectContaining({ analytics_storage: "denied" })
        );
    });

    it("aceitar monta as tags e fecha o banner na mesma interação", () => {
        renderProvider(bootstrap());

        fireEvent.click(screen.getByText("Aceitar tudo"));

        expect(setCookieMock).toHaveBeenCalledWith(
            CONSENT_COOKIE,
            "v1:analytics=granted",
            TTL_IN_SECONDS,
            { domain: undefined, secure: false }
        );
        expect(screen.queryByText("Cookies neste site")).toBeNull();
        expect(screen.getByTestId("google-analytics")).toBeTruthy();
    });

    it("repassa o domínio e o Secure que o servidor resolveu", () => {
        renderProvider(
            bootstrap({ cookieDomain: "exemplo.com.br", secure: true })
        );

        fireEvent.click(screen.getByText("Recusar tudo"));

        expect(setCookieMock).toHaveBeenCalledWith(
            CONSENT_COOKIE,
            "v1:analytics=denied",
            TTL_IN_SECONDS,
            { domain: "exemplo.com.br", secure: true }
        );
    });

    it.each(["Recusar tudo", "Aceitar tudo"])(
        "grava uma escolha só quando %s recebe clique duplo",
        (label) => {
            renderProvider(bootstrap());

            const button = screen.getByText(label);
            fireEvent.click(button);
            fireEvent.click(button);

            expect(setCookieMock).toHaveBeenCalledTimes(1);
            expect(gtag).toHaveBeenCalledTimes(1);
        }
    );
});

describe("AnalyticsProvider — modo degradado", () => {
    it("não monta banner, script nem tag quando não há medição configurada", () => {
        const { container } = renderProvider(
            bootstrap({ consentable: false, gaMeasurementId: null })
        );

        expect(screen.queryByText("Cookies neste site")).toBeNull();
        expect(consentModeScript(container)).toBeUndefined();
        expect(screen.queryByTestId("google-analytics")).toBeNull();
        expect(screen.queryByTestId("vercel-analytics")).toBeNull();
        expect(screen.getByText("conteúdo da página")).toBeTruthy();
    });
});
