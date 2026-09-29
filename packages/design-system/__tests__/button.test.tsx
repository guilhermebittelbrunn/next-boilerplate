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
});
