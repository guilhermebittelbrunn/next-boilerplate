import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SettingsSection } from "@/shared/components/ui/SettingsSection";

afterEach(cleanup);

describe("SettingsSection", () => {
    it("é uma região nomeada pelo h3 do título", () => {
        render(
            <SettingsSection description="Nome e foto" title="Dados pessoais">
                <button type="button">Salvar</button>
            </SettingsSection>
        );

        const region = screen.getByRole("region", { name: "Dados pessoais" });
        expect(
            screen.getByRole("heading", { level: 3, name: "Dados pessoais" })
        ).toBeTruthy();
        expect(region.textContent).toContain("Nome e foto");
        expect(region.querySelector("button")?.textContent).toBe("Salvar");
    });

    it("usa o tom padrão quando nada é pedido", () => {
        render(<SettingsSection title="Senha" />);

        expect(
            screen
                .getByRole("region", { name: "Senha" })
                .getAttribute("data-tone")
        ).toBe("default");
    });

    it("marca o tom destrutivo na região", () => {
        render(
            <SettingsSection title="Excluir minha conta" tone="destructive" />
        );

        const region = screen.getByRole("region", {
            name: "Excluir minha conta",
        });
        expect(region.getAttribute("data-tone")).toBe("destructive");
        expect(region.className).toContain("border-destructive");
    });
});
