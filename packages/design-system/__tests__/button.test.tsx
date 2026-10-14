import { Button } from "@repo/design-system/components/ui/button";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

const LABEL = "Save";

afterEach(cleanup);

describe("Button", () => {
    it("keeps its accessible name while loading", () => {
        render(<Button loading>{LABEL}</Button>);

        const button = screen.getByRole("button", { name: LABEL });
        expect(button.getAttribute("aria-busy")).toBe("true");
        expect(button.hasAttribute("disabled")).toBe(true);
    });

    it("keeps the spinner out of the accessibility tree", () => {
        const { container } = render(<Button loading>{LABEL}</Button>);

        expect(
            container.querySelector("svg")?.getAttribute("aria-hidden")
        ).toBe("true");
        expect(screen.queryByRole("status")).toBeNull();
    });

    it("does not announce itself as busy when idle", () => {
        render(<Button>{LABEL}</Button>);

        const button = screen.getByRole("button", { name: LABEL });
        expect(button.hasAttribute("aria-busy")).toBe(false);
        expect(button.hasAttribute("disabled")).toBe(false);
    });

    it("stays locked while loading even when the caller enables it", () => {
        render(
            <Button disabled={false} loading>
                {LABEL}
            </Button>
        );

        expect(
            screen.getByRole("button", { name: LABEL }).hasAttribute("disabled")
        ).toBe(true);
    });

    it("keeps the icon in place while loading", () => {
        render(
            <Button icon={<svg data-testid="icon" />} loading>
                {LABEL}
            </Button>
        );

        expect(screen.getByTestId("icon")).toBeTruthy();
    });

    it("keeps the label in the layout, transparent, while loading", () => {
        render(<Button loading>{LABEL}</Button>);

        const label = screen.getByText(LABEL);
        expect(label.closest(".sr-only")).toBeNull();
        expect(label.classList.contains("opacity-0")).toBe(true);
    });

    it("honours an explicit disabled without loading", () => {
        render(<Button disabled>{LABEL}</Button>);

        expect(
            screen.getByRole("button", { name: LABEL }).hasAttribute("disabled")
        ).toBe(true);
    });

    it("renders the idle content unchanged", () => {
        const { container } = render(
            <Button icon={<svg data-testid="icon" />}>{LABEL}</Button>
        );

        const button = screen.getByRole("button", { name: LABEL });
        const content = button.firstElementChild;
        expect(button.childElementCount).toBe(1);
        expect(content?.tagName).toBe("DIV");
        expect(content?.className).toBe("flex items-center gap-2");
        expect(content?.contains(screen.getByTestId("icon"))).toBe(true);
        expect(content?.textContent).toBe(LABEL);
        expect(container.querySelectorAll("svg")).toHaveLength(1);
    });
});
