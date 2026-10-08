/** biome-ignore-all lint/style/noMagicNumbers: the WCAG luminance coefficients and thresholds are published constants. */
import { ActionsMenu } from "@repo/design-system/components/ui/action-menu";
import { Table } from "@repo/design-system/components/ui/table";
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
} from "@testing-library/react";
import { Button, theme } from "antd";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
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

// jsdom ships without matchMedia, and the antd table subscribes to it on mount.
window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
})) as unknown as typeof window.matchMedia;

const { AntdAppProvider, antdSeedColors, antdThemes } = await import(
    "@repo/design-system/providers/antd-app"
);

const WCAG_NON_TEXT = 3;
const BLACK = "#000000";
const HYDRATION_MESSAGE = /hydrat/i;
const pageBackground = { light: "#ffffff", dark: "#0a0a0a" } as const;
const modes = ["light", "dark"] as const;

function relativeLuminance(hex: string): number {
    const channels = [1, 3, 5].map((start) => {
        const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
        return value <= 0.040_45
            ? value / 12.92
            : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(first: string, second: string): number {
    const [lighter, darker] = [
        relativeLuminance(first),
        relativeLuminance(second),
    ].sort((a, b) => b - a);
    return (lighter + 0.05) / (darker + 0.05);
}

function TokenProbe() {
    const { token } = theme.useToken();
    return (
        <output data-testid="token">
            {[token.colorPrimary, token.colorError, token.colorLink].join(" ")}
        </output>
    );
}

function AntdSurface() {
    return (
        <AntdAppProvider>
            <Table
                columns={[{ title: "Name", dataIndex: "name" }]}
                dataSource={[{ id: "1", name: "First" }]}
                rowKey="id"
            />
            <ActionsMenu onDelete={vi.fn()} onEdit={vi.fn()} />
        </AntdAppProvider>
    );
}

function injectedCss(): string {
    return Array.from(document.querySelectorAll("style"))
        .map((style) => style.textContent ?? "")
        .join("\n");
}

function tokenHashes(): string[] {
    const hashes = Array.from(
        document.querySelectorAll("style[data-token-hash]"),
        (style) => style.getAttribute("data-token-hash") ?? ""
    );
    return [...new Set(hashes)];
}

function tokenHashesWith(fragment: string): string[] {
    const hashes = Array.from(
        document.querySelectorAll("style[data-token-hash]")
    )
        .filter((style) => style.textContent?.includes(fragment))
        .map((style) => style.getAttribute("data-token-hash") ?? "");
    return [...new Set(hashes)];
}

afterEach(() => {
    cleanup();
    themeState.forcedTheme = undefined;
    themeState.resolvedTheme = undefined;
});

describe("antd theme config", () => {
    it.each(modes)(
        "%s: every seed colour resolves to the theme hex",
        (mode) => {
            const token = theme.getDesignToken(antdThemes[mode]);
            const colors = antdSeedColors[mode];

            expect({
                colorPrimary: token.colorPrimary,
                colorInfo: token.colorInfo,
                colorLink: token.colorLink,
                colorSuccess: token.colorSuccess,
                colorWarning: token.colorWarning,
                colorError: token.colorError,
            }).toEqual({
                colorPrimary: colors.primary,
                colorInfo: colors.primary,
                colorLink: colors.primary,
                colorSuccess: colors.success,
                colorWarning: colors.warning,
                colorError: colors.destructive,
            });
            expect(Object.values(colors)).not.toContain(BLACK);
        }
    );

    it.each(modes)(
        "%s: focus outline, primary and warning reach 3:1 on the page",
        (mode) => {
            const token = theme.getDesignToken(antdThemes[mode]);
            const background = pageBackground[mode];

            expect(token.colorPrimaryBorder).toBe(antdSeedColors[mode].primary);
            for (const color of [
                token.colorPrimaryBorder,
                token.colorPrimary,
                token.colorWarning,
            ]) {
                expect(contrastRatio(color, background)).toBeGreaterThanOrEqual(
                    WCAG_NON_TEXT
                );
            }
        }
    );

    it("dark derives dark background steps from the seeds", () => {
        const token = theme.getDesignToken(antdThemes.dark);

        expect(relativeLuminance(token.colorErrorBg)).toBeLessThan(0.05);
        expect(relativeLuminance(token.controlItemBgActive)).toBeLessThan(0.2);
    });
});

describe("AntdAppProvider", () => {
    it.each([
        ["dark", "#fafafa", "#ff6467"],
        ["light", "#171717", "#e7000b"],
        [undefined, "#171717", "#e7000b"],
    ])(
        "resolvedTheme %s gives colorPrimary %s and colorError %s",
        (resolvedTheme, primary, destructive) => {
            themeState.resolvedTheme = resolvedTheme;

            render(
                <AntdAppProvider>
                    <TokenProbe />
                </AntdAppProvider>
            );

            expect(screen.getByTestId("token").textContent).toBe(
                `${primary} ${destructive} ${primary}`
            );
        }
    );

    it("dark: the solid primary button keeps the primary foreground as text", () => {
        themeState.resolvedTheme = "dark";

        render(
            <AntdAppProvider>
                <Button type="primary">OK</Button>
            </AntdAppProvider>
        );

        expect(injectedCss()).toContain(
            `color:var(--color-primary-foreground);background:${antdSeedColors.dark.primary};`
        );
    });

    it("forcedTheme wins over the stored preference in resolvedTheme", () => {
        themeState.forcedTheme = "dark";
        themeState.resolvedTheme = "light";

        render(
            <AntdAppProvider>
                <TokenProbe />
            </AntdAppProvider>
        );

        expect(screen.getByTestId("token").textContent).toBe(
            "#fafafa #ff6467 #fafafa"
        );
    });

    it("switching theme without reloading drops the styles of the previous theme", () => {
        const solidPrimary = (mode: "light" | "dark") =>
            `color:var(--color-primary-foreground);background:${antdSeedColors[mode].primary};`;
        const renderButton = () => (
            <AntdAppProvider>
                <Button type="primary">OK</Button>
            </AntdAppProvider>
        );

        themeState.resolvedTheme = "light";
        const { rerender } = render(renderButton());
        const lightHashes = tokenHashesWith(solidPrimary("light"));
        expect(lightHashes).toHaveLength(1);

        themeState.resolvedTheme = "dark";
        rerender(renderButton());
        const darkHashes = tokenHashesWith(solidPrimary("dark"));
        expect(darkHashes).toHaveLength(1);
        expect(tokenHashes()).not.toContain(lightHashes[0]);
        expect(injectedCss()).not.toContain(solidPrimary("light"));

        themeState.resolvedTheme = "light";
        rerender(renderButton());
        expect(tokenHashesWith(solidPrimary("light"))).toEqual(lightHashes);
        expect(tokenHashes()).not.toContain(darkHashes[0]);
        expect(injectedCss()).not.toContain(solidPrimary("dark"));
    });

    it("dark: the danger menu item uses the dark destructive colour at rest and on hover", async () => {
        themeState.resolvedTheme = "dark";

        render(
            <AntdAppProvider>
                <ActionsMenu onDelete={vi.fn()} />
            </AntdAppProvider>
        );
        fireEvent.click(screen.getByRole("button"));
        await screen.findByRole("menuitem");

        const dangerRules = Array.from(
            injectedCss().matchAll(/[^{}]*-item-danger[^{}]*\{([^}]*)\}/g),
            ([, declarations]) => declarations
        );
        const destructive = antdSeedColors.dark.destructive;
        expect(dangerRules).toContain(`color:${destructive};`);
        expect(dangerRules).toContain(
            `color:var(--color-background);background-color:${destructive};`
        );
        expect(dangerRules.join("\n")).not.toContain(
            antdSeedColors.light.destructive
        );
    });

    it("hydrates server markup rendered before the theme resolves", async () => {
        const serverHtml = renderToString(<AntdSurface />);
        expect(serverHtml).toContain("ant-table");

        themeState.resolvedTheme = "dark";
        const container = document.createElement("div");
        container.innerHTML = serverHtml;
        document.body.append(container);
        const recoverableErrors: unknown[] = [];
        const consoleError = vi
            .spyOn(console, "error")
            .mockReturnValue(undefined);

        const root = await act(() =>
            hydrateRoot(container, <AntdSurface />, {
                onRecoverableError: (error) => recoverableErrors.push(error),
            })
        );

        const hydrationWarnings = consoleError.mock.calls.filter((call) =>
            HYDRATION_MESSAGE.test(String(call[0]))
        );
        consoleError.mockRestore();

        expect(recoverableErrors).toEqual([]);
        expect(hydrationWarnings).toEqual([]);
        act(() => root.unmount());
        container.remove();
    });
});
