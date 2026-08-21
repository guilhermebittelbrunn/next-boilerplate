"use client";

import { theme as antdTheme, ConfigProvider } from "antd";
import type { ReactNode } from "react";

/**
 * Envolve a app com o tema Ant Design alinhado às variáveis CSS (light/dark via `.dark`)
 * e reativa o efeito de onda (wave) nos gatilhos — botões, tags, etc.
 */
export function AntdAppProvider({ children }: { children: ReactNode }) {
    return (
        <ConfigProvider
            theme={{
                hashed: false,
                algorithm: antdTheme.defaultAlgorithm,
                token: {
                    colorPrimary: "var(--color-primary)",
                    colorSuccess: "var(--color-success)",
                    colorWarning: "var(--color-chart-4)",
                    colorError: "var(--color-destructive)",
                    colorInfo: "var(--color-primary)",
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
                    colorLink: "var(--color-primary)",
                    colorLinkHover: "var(--color-primary)",
                    colorLinkActive: "var(--color-primary)",
                    borderRadius: 10,
                    fontFamily: "var(--font-sans)",
                },
                components: {
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
                    },
                },
            }}
            wave={{ disabled: false }}
        >
            {children}
        </ConfigProvider>
    );
}
