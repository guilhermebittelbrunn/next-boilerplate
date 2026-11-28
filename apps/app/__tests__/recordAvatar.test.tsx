import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@repo/design-system/components/ui/responsive-image", () => ({
    default: ({ alt, src }: { alt: string; src: string }) => (
        <span aria-label={alt} data-src={src} role="img" />
    ),
}));

const { initialsOf, RecordAvatar } = await import(
    "@/shared/components/ui/RecordAvatar"
);

describe("initialsOf", () => {
    it("usa a primeira letra do primeiro e do último nome", () => {
        expect(initialsOf("Ana Maria Souza")).toBe("AS");
    });

    it("devolve uma letra para nome de uma palavra só", () => {
        expect(initialsOf("ana")).toBe("A");
    });

    it("ignora sufixos como Jr. e III", () => {
        expect(initialsOf("Carlos Lima Jr.")).toBe("CL");
        expect(initialsOf("Pedro Alves III")).toBe("PA");
    });

    it("tira as iniciais da parte local do e-mail, quebrando em ponto, hífen, sublinhado e mais", () => {
        expect(initialsOf("joao.silva@example.com")).toBe("JS");
        expect(initialsOf("maria_clara-santos@example.com")).toBe("MS");
        expect(initialsOf("qa+entidade@example.com")).toBe("QE");
        expect(initialsOf("solo@example.com")).toBe("S");
    });

    it("ignora espaços sobrando nas pontas e entre palavras", () => {
        expect(initialsOf("  Bruno    Costa  ")).toBe("BC");
    });

    it("devolve vazio quando não há texto", () => {
        expect(initialsOf("")).toBe("");
        expect(initialsOf("   ")).toBe("");
    });

    it("mantém letras acentuadas e caracteres fora do plano básico inteiros", () => {
        expect(initialsOf("élise ünal")).toBe("ÉÜ");
        expect(initialsOf("𝒜lpha Beta")).toBe("𝒜B");
    });
});

describe("RecordAvatar", () => {
    it("mostra a foto com o nome como texto alternativo quando há src", () => {
        const { container } = render(
            <RecordAvatar name="Ana Souza" src="https://example.com/a.png" />
        );

        const image = container.querySelector('[role="img"]');
        expect(image?.getAttribute("aria-label")).toBe("Ana Souza");
        expect(image?.getAttribute("data-src")).toBe(
            "https://example.com/a.png"
        );
        expect(container.textContent).toBe("");
    });

    it("mostra as iniciais escondidas do leitor de tela quando não há foto", () => {
        const { container } = render(
            <RecordAvatar name="Ana Souza" src={null} />
        );

        const fallback = container.firstElementChild;
        expect(container.querySelector('[role="img"]')).toBeNull();
        expect(fallback?.textContent).toBe("AS");
        expect(fallback?.getAttribute("aria-hidden")).toBe("true");
    });
});
