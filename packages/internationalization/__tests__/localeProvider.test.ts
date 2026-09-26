import { createElement, Suspense, use } from "react";
import { renderToReadableStream, renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { globalTranslations } from "../translations/global";
import { type Locale, locales } from "../utils";

const { paramsMock } = vi.hoisted(() => ({
    paramsMock: vi.fn<() => Record<string, string | string[]>>(),
}));

vi.mock("next/navigation", () => ({
    useParams: () => paramsMock(),
}));

type ClientModule = typeof import("../client");

let client: ClientModule;

beforeEach(async () => {
    vi.resetModules();
    paramsMock.mockReset();
    client = await import("../client.js");
});

afterEach(() => {
    vi.unstubAllGlobals();
});

function browserWithCookie(cookie: string) {
    vi.stubGlobal("window", {});
    vi.stubGlobal("document", { cookie });
}

function knownText(locale: Locale): string {
    return globalTranslations[locale].packages.utils.apiErrors.USERS_NOT_FOUND;
}

function Probe() {
    const { locale, dictionary } = client.getDictionary();
    return createElement(
        "p",
        null,
        `${locale}|${dictionary.packages.utils.apiErrors.USERS_NOT_FOUND}`
    );
}

function HookProbe() {
    const { locale } = client.useDictionary();
    return createElement("p", null, `hook:${locale}`);
}

function withProvider(...children: ReturnType<typeof createElement>[]) {
    return createElement(client.LocaleProvider, null, ...children);
}

function decode(html: string): string {
    return html
        .replaceAll("&#x27;", "'")
        .replaceAll("&quot;", '"')
        .replaceAll("&amp;", "&");
}

async function readStream(stream: ReadableStream<Uint8Array>) {
    return decode(await new Response(stream).text());
}

describe("LocaleProvider no servidor", () => {
    it.each(locales)(
        "renderiza o componente client no idioma do segmento (%s)",
        (locale) => {
            paramsMock.mockReturnValue({ locale });

            const html = decode(
                renderToString(withProvider(createElement(Probe)))
            );

            expect(html).toContain(`${locale}|${knownText(locale)}`);
        }
    );

    it("não usa o cookie do servidor: sem window, en na URL continua en", () => {
        paramsMock.mockReturnValue({ locale: "en" });

        const html = decode(renderToString(withProvider(createElement(Probe))));

        expect(html).toContain(`en|${knownText("en")}`);
        expect(html).not.toContain("pt-br|");
    });

    it.each<{ label: string; params: Record<string, string> }>([
        { label: "idioma não suportado", params: { locale: "fr" } },
        { label: "sem segmento de idioma", params: {} },
    ])("cai no idioma padrão com $label", ({ params }) => {
        paramsMock.mockReturnValue(params);

        const html = decode(renderToString(withProvider(createElement(Probe))));

        expect(html).toContain(`pt-br|${knownText("pt-br")}`);
    });

    it("useDictionary lê o mesmo idioma do provider", () => {
        paramsMock.mockReturnValue({ locale: "es" });

        const html = renderToString(withProvider(createElement(HookProbe)));

        expect(html).toContain("hook:es");
    });

    it("isola duas requisições concorrentes", async () => {
        let release: (() => void) | undefined;
        const pending = new Promise<void>((resolve) => {
            release = resolve;
        });

        function WaitsThenProbes() {
            use(pending);
            return createElement(Probe);
        }

        paramsMock.mockReturnValue({ locale: "en" });
        const slowStream = await renderToReadableStream(
            withProvider(
                createElement(
                    Suspense,
                    { fallback: createElement("span", null, "loading") },
                    createElement(WaitsThenProbes)
                )
            )
        );

        paramsMock.mockReturnValue({ locale: "es" });
        const fastStream = await renderToReadableStream(
            withProvider(createElement(Probe))
        );
        await fastStream.allReady;

        release?.();
        await slowStream.allReady;

        expect(await readStream(fastStream)).toContain(`es|${knownText("es")}`);
        const slowHtml = await readStream(slowStream);
        expect(slowHtml).toContain(`en|${knownText("en")}`);
        expect(slowHtml).not.toContain("es|");
    });

    it("não guarda o idioma em estado de módulo entre requisições", () => {
        paramsMock.mockReturnValue({ locale: "es" });
        renderToString(withProvider(createElement(Probe)));

        const html = decode(renderToString(createElement(Probe)));

        expect(html).toContain(`pt-br|${knownText("pt-br")}`);
    });
});

describe("LocaleProvider no navegador", () => {
    it("a URL vence o cookie antigo, inclusive fora do render", () => {
        browserWithCookie("x-locale=pt-br");
        paramsMock.mockReturnValue({ locale: "en" });

        const html = decode(renderToString(withProvider(createElement(Probe))));

        expect(html).toContain(`en|${knownText("en")}`);
        expect(client.getDictionary().locale).toBe("en");
    });

    it("segue a última URL renderizada depois de uma troca de idioma", () => {
        browserWithCookie("x-locale=en");
        paramsMock.mockReturnValue({ locale: "en" });
        renderToString(withProvider(createElement(Probe)));

        paramsMock.mockReturnValue({ locale: "es" });
        const html = decode(renderToString(withProvider(createElement(Probe))));

        expect(html).toContain(`es|${knownText("es")}`);
        expect(client.getDictionary().locale).toBe("es");
    });

    it("sem provider montado, mantém a leitura do cookie", () => {
        browserWithCookie("x-locale=es");

        expect(client.getDictionary().locale).toBe("es");
        expect(renderToString(createElement(HookProbe))).toContain("hook:es");
    });
});
