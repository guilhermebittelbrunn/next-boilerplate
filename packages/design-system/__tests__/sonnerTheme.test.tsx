import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const themeState = vi.hoisted(() => ({
    forcedTheme: undefined as string | undefined,
    resolvedTheme: undefined as string | undefined,
}));

vi.mock("next-themes", () => ({
    useTheme: () => ({
        forcedTheme: themeState.forcedTheme,
        resolvedTheme: themeState.resolvedTheme,
    }),
}));

vi.mock("sonner", () => ({
    Toaster: ({ theme }: { theme?: string }) => (
        <div data-testid="toaster" data-theme={theme} />
    ),
}));

const { Toaster } = await import("@repo/design-system/components/ui/sonner");

function renderedTheme(
    forcedTheme: string | undefined,
    resolvedTheme: string | undefined
) {
    themeState.forcedTheme = forcedTheme;
    themeState.resolvedTheme = resolvedTheme;
    render(<Toaster />);
    return screen.getByTestId("toaster").getAttribute("data-theme");
}

afterEach(cleanup);

describe("Toaster theme", () => {
    it("follows a forced dark theme over a stored light preference", () => {
        expect(renderedTheme("dark", "light")).toBe("dark");
    });

    it("follows a forced light theme over a stored dark preference", () => {
        expect(renderedTheme("light", "dark")).toBe("light");
    });

    it("follows the resolved theme when no theme is forced", () => {
        expect(renderedTheme(undefined, "dark")).toBe("dark");
    });

    it("falls back to light when next-themes has not resolved a theme", () => {
        expect(renderedTheme(undefined, undefined)).toBe("light");
    });
});
