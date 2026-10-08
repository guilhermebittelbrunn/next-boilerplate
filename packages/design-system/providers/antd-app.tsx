"use client";

import {
    theme as antdTheme,
    ConfigProvider,
    type MappingAlgorithm,
    type ThemeConfig,
} from "antd";
import { useTheme } from "next-themes";
import type { ReactNode } from "react";

type ThemeMode = "light" | "dark";

// antd derives its colour palettes in JavaScript and reads a CSS var() as black, so its seed
// colours are hex copies of the globals.css tokens --primary, --success, --warning and --destructive.
export const antdSeedColors = {
    light: {
        primary: "#171717",
        success: "#007a55",
        warning: "#bb4d00",
        destructive: "#e7000b",
    },
    dark: {
        primary: "#fafafa",
        success: "#007a55",
        warning: "#ffb900",
        destructive: "#ff6467",
    },
} as const satisfies Record<ThemeMode, Record<string, `#${string}`>>;

// antd's dark algorithm blends every seed with #141414; putting the seeds back keeps the base
// colours equal to the CSS theme while the derived hover, background and border steps stay dark.
const keepSeedColors: MappingAlgorithm = (
    seedToken,
    mapToken = antdTheme.defaultAlgorithm(seedToken)
) => ({
    ...mapToken,
    colorPrimary: seedToken.colorPrimary,
    colorSuccess: seedToken.colorSuccess,
    colorWarning: seedToken.colorWarning,
    colorError: seedToken.colorError,
    colorInfo: seedToken.colorInfo,
    colorLink: seedToken.colorLink,
});

const neutralTokens = {
    colorText: "var(--color-foreground)",
    colorTextSecondary: "var(--color-muted-foreground)",
    colorTextTertiary: "var(--color-muted-foreground)",
    colorTextQuaternary: "var(--color-muted-foreground)",
    colorBgContainer: "var(--color-card)",
    colorBgElevated: "var(--color-popover)",
    colorBgLayout: "var(--color-background)",
    colorBorder: "var(--color-border)",
    colorBorderSecondary: "var(--color-border)",
    colorSplit: "var(--color-border)",
    colorFillAlter: "var(--color-muted)",
    colorFillSecondary: "var(--color-muted)",
    colorFillTertiary: "var(--color-muted)",
    colorFillQuaternary: "var(--color-muted)",
    colorLinkHover: "var(--color-primary)",
    colorLinkActive: "var(--color-primary)",
    borderRadius: 10,
    fontFamily: "var(--font-sans)",
} satisfies ThemeConfig["token"];

const components = {
    Table: {
        headerBg: "var(--color-background)",
        headerColor: "var(--color-foreground)",
        headerSortActiveBg: "var(--color-accent)",
        headerSortHoverBg: "var(--color-accent)",
        bodySortBg: "var(--color-accent)",
        borderColor: "var(--color-border)",
        headerSplitColor: "var(--color-border)",
        footerBg: "var(--color-muted)",
        footerColor: "var(--color-foreground)",
        filterDropdownBg: "var(--color-popover)",
        filterDropdownMenuBg: "var(--color-popover)",
    },
    Menu: {
        popupBg: "var(--color-popover)",
        itemBg: "transparent",
        subMenuItemBg: "transparent",
        itemColor: "var(--color-foreground)",
        itemHoverColor: "var(--color-foreground)",
        itemHoverBg: "var(--color-accent)",
        itemSelectedColor: "var(--color-foreground)",
        itemSelectedBg: "var(--color-accent)",
        itemActiveBg: "var(--color-accent)",
        dangerItemColor: "var(--color-destructive)",
        dangerItemHoverColor: "var(--color-destructive)",
        dangerItemSelectedColor: "var(--color-destructive)",
        dangerItemActiveBg: "var(--color-accent)",
        dangerItemSelectedBg: "var(--color-accent)",
    },
    Dropdown: {
        colorTextLightSolid: "var(--color-background)",
    },
    Modal: {
        contentBg: "var(--color-popover)",
        headerBg: "var(--color-popover)",
        footerBg: "var(--color-popover)",
        titleColor: "var(--color-foreground)",
    },
    Button: {
        defaultColor: "var(--color-foreground)",
        defaultBg: "var(--color-background)",
        defaultBorderColor: "var(--color-border)",
        defaultHoverBg: "var(--color-accent)",
        defaultHoverColor: "var(--color-foreground)",
        defaultHoverBorderColor: "var(--color-border)",
        primaryColor: "var(--color-primary-foreground)",
    },
} satisfies ThemeConfig["components"];

function buildAntdTheme(mode: ThemeMode): ThemeConfig {
    const colors = antdSeedColors[mode];
    return {
        hashed: false,
        algorithm:
            mode === "dark"
                ? [antdTheme.darkAlgorithm, keepSeedColors]
                : antdTheme.defaultAlgorithm,
        token: {
            ...neutralTokens,
            colorPrimary: colors.primary,
            colorSuccess: colors.success,
            colorWarning: colors.warning,
            colorError: colors.destructive,
            colorInfo: colors.primary,
            colorLink: colors.primary,
            colorPrimaryBorder: colors.primary,
        },
        components,
    };
}

export const antdThemes: Record<ThemeMode, ThemeConfig> = {
    light: buildAntdTheme("light"),
    dark: buildAntdTheme("dark"),
};

export function AntdAppProvider({ children }: { children: ReactNode }) {
    const { forcedTheme, resolvedTheme } = useTheme();
    // next-themes keeps the stored preference in resolvedTheme even when a page forces a theme.
    const activeTheme = forcedTheme ?? resolvedTheme;
    return (
        <ConfigProvider
            theme={antdThemes[activeTheme === "dark" ? "dark" : "light"]}
            wave={{ disabled: false }}
        >
            {children}
        </ConfigProvider>
    );
}
