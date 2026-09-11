import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useThemeMock, toastMock } = vi.hoisted(() => ({
    useThemeMock: vi.fn(),
    toastMock: {
        success: vi.fn(),
        info: vi.fn(),
        warning: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock("next-themes", () => ({
    useTheme: () => useThemeMock(),
}));

vi.mock("react-toastify", () => ({
    toast: toastMock,
}));

const { useAlert } = await import("@repo/design-system/hooks/useAlert");

const THEME_THE_TOAST_HAS_A_STYLESHEET_FOR = /^(light|dark)$/;

type ThemeState = {
    theme?: string;
    resolvedTheme?: string;
    systemTheme?: string;
};

function themeHandedToToast(
    state: ThemeState,
    variant: keyof typeof toastMock = "error"
) {
    useThemeMock.mockReturnValue(state);

    const { result } = renderHook(() => useAlert());
    const alerts = {
        success: result.current.successAlert,
        info: result.current.infoAlert,
        warning: result.current.warningAlert,
        error: result.current.errorAlert,
    };
    alerts[variant]("mensagem");

    const call = toastMock[variant].mock.calls.at(-1);
    return (call?.[1] as { theme?: string } | undefined)?.theme;
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe("useAlert", () => {
    /**
     * The toast library only ships stylesheets for "light" and "dark". Handing it
     * anything else leaves it with no rule for the text colour, so it keeps its
     * default white — unreadable over the light background the hook itself sets.
     */
    it.each([
        [
            "system preference resolved to light",
            { theme: "system", resolvedTheme: "light" },
        ],
        [
            "system preference resolved to dark",
            { theme: "system", resolvedTheme: "dark" },
        ],
        ["light picked explicitly", { theme: "light", resolvedTheme: "light" }],
        ["dark picked explicitly", { theme: "dark", resolvedTheme: "dark" }],
        ["nothing resolved yet", {}],
    ])(
        "hands the toast a theme it has a stylesheet for: %s",
        (_case, state) => {
            const theme = themeHandedToToast(state);

            expect(theme).toMatch(THEME_THE_TOAST_HAS_A_STYLESHEET_FOR);
            expect(theme).not.toBe("system");
        }
    );

    it("never leaks the raw preference when it is the literal system", () => {
        expect(
            themeHandedToToast({ theme: "system", resolvedTheme: "light" })
        ).toBe("light");
        expect(
            themeHandedToToast({ theme: "system", resolvedTheme: "dark" })
        ).toBe("dark");
    });

    it.each(["success", "info", "warning", "error"] as const)(
        "keeps the %s toast readable under the system preference",
        (variant) => {
            const theme = themeHandedToToast(
                { theme: "system", resolvedTheme: "light" },
                variant
            );

            expect(theme).toBe("light");
        }
    );

    it("paints the toast surface with the app background token", () => {
        useThemeMock.mockReturnValue({
            theme: "light",
            resolvedTheme: "light",
        });

        const { result } = renderHook(() => useAlert());
        result.current.errorAlert("mensagem");

        const options = toastMock.error.mock.calls.at(-1)?.[1] as {
            className?: string;
        };
        expect(options.className).toContain("bg-background");
    });
});
