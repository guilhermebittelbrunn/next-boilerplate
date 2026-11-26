import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

const { default: AdminAccountLoading } = await import(
    "@/app/[locale]/(authenticated)/(admin)/admin/(pages)/account/(pages)/(home)/loading"
);

afterEach(cleanup);

const ADMIN_ACCOUNT_SECTION_COUNT = 3;

describe("esqueleto da conta do admin", () => {
    it("carrega na coluna estreita centralizada", () => {
        const { container } = render(<AdminAccountLoading />);
        const body = container.children.item(1);

        expect(body?.className).toContain("max-w-4xl");
        expect(body?.className).toContain("mx-auto");
    });

    it("reserva uma linha de navegação por seção da área do admin", () => {
        const { container } = render(<AdminAccountLoading />);
        const sectionNav = container.querySelector(".w-48");

        expect(sectionNav?.children).toHaveLength(ADMIN_ACCOUNT_SECTION_COUNT);
    });
});
