import { beforeEach, describe, expect, it, vi } from "vitest";

const { envMock } = vi.hoisted(() => ({
    envMock: { NEXT_PUBLIC_PRIVACY_CONTACT: undefined as string | undefined },
}));

vi.mock("@/env", () => ({ env: envMock }));

const { resolvePrivacyChannel } = await import("@/shared/lib/privacyContact");

const FORM_LABEL = "Formulário de contato";

beforeEach(() => {
    envMock.NEXT_PUBLIC_PRIVACY_CONTACT = undefined;
});

describe("resolvePrivacyChannel", () => {
    it("publica o endereço do fork como mailto", () => {
        envMock.NEXT_PUBLIC_PRIVACY_CONTACT = "privacidade@exemplo.com";

        expect(resolvePrivacyChannel("pt-br", FORM_LABEL)).toEqual({
            href: "mailto:privacidade@exemplo.com",
            label: "privacidade@exemplo.com",
        });
    });

    it("cai no formulário de contato quando a variável não existe", () => {
        expect(resolvePrivacyChannel("en", FORM_LABEL)).toEqual({
            href: "/en/contact",
            label: FORM_LABEL,
        });
    });

    it("trata string vazia como ausência, que é como o .env.example recusa a feature", () => {
        envMock.NEXT_PUBLIC_PRIVACY_CONTACT = "";

        expect(resolvePrivacyChannel("es", FORM_LABEL)).toEqual({
            href: "/es/contact",
            label: FORM_LABEL,
        });
    });

    it("mantém o canal no idioma da página", () => {
        expect(resolvePrivacyChannel("pt-br", FORM_LABEL).href).toBe(
            "/pt-br/contact"
        );
    });
});
