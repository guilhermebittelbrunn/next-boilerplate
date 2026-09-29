import { readFileSync } from "node:fs";
import path from "node:path";
import { ActionsMenu } from "@repo/design-system/components/ui/action-menu";
import { AntdAppProvider } from "@repo/design-system/providers/antd-app";
import { getDictionary } from "@repo/internationalization/client";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const actionMenuCopy = getDictionary().dictionary.components.actionMenu;

const CSS_COMMENT = /\/\*[\s\S]*?\*\//g;
const CSS_RULE = /([^{}]+)\{([^{}]*)\}/g;
const COLOR_DECLARATION = /(?:^|;)\s*color\s*:\s*([^;]+)/g;
const WHITESPACE_RUN = /\s+/g;
const DANGER_ITEM = ".ant-dropdown-menu-item-danger";

type CssRule = { selectors: string[]; colors: string[] };

function readGlobalRules(): CssRule[] {
    const css = readFileSync(
        path.resolve(__dirname, "../styles/globals.css"),
        "utf8"
    ).replace(CSS_COMMENT, "");

    return Array.from(css.matchAll(CSS_RULE), ([, selectorText, body]) => ({
        selectors: selectorText
            .split(",")
            .map((selector) => selector.replace(WHITESPACE_RUN, " ").trim()),
        colors: Array.from(body.matchAll(COLOR_DECLARATION), ([, value]) =>
            value.trim()
        ),
    }));
}

function targetsDangerDescendant(selector: string): boolean {
    const index = selector.indexOf(DANGER_ITEM);
    return (
        index >= 0 && selector.slice(index + DANGER_ITEM.length).startsWith(" ")
    );
}

afterEach(cleanup);

describe("ActionsMenu", () => {
    it("renders the trigger as a named, focusable button", () => {
        render(<ActionsMenu onDelete={vi.fn()} onEdit={vi.fn()} />);

        const trigger = screen.getByRole("button", {
            name: actionMenuCopy.trigger,
        });
        expect(trigger.getAttribute("type")).toBe("button");

        trigger.focus();

        expect(document.activeElement).toBe(trigger);
    });

    it("opens the menu from the trigger", async () => {
        render(<ActionsMenu onDelete={vi.fn()} onEdit={vi.fn()} />);

        fireEvent.click(
            screen.getByRole("button", { name: actionMenuCopy.trigger })
        );

        expect(await screen.findByText(actionMenuCopy.edit)).toBeTruthy();
        expect(screen.getByText(actionMenuCopy.delete)).toBeTruthy();
    });

    it("paints the danger item with the theme tokens at rest and on hover", async () => {
        render(
            <AntdAppProvider>
                <ActionsMenu onDelete={vi.fn()} />
            </AntdAppProvider>
        );

        fireEvent.click(
            screen.getByRole("button", { name: actionMenuCopy.trigger })
        );
        await screen.findByText(actionMenuCopy.delete);

        const injectedCss = Array.from(document.querySelectorAll("style"))
            .map((style) => style.textContent ?? "")
            .join("\n");
        const dangerRules = Array.from(
            injectedCss.matchAll(/[^{}]*-item-danger[^{}]*\{([^}]*)\}/g),
            ([, declarations]) => declarations
        );

        expect(dangerRules).toContain("color:var(--color-destructive);");
        expect(dangerRules).toContain(
            "color:var(--color-background);background-color:var(--color-destructive);"
        );
    });

    it("lets the danger item's text and icon inherit the item colour", () => {
        const rules = readGlobalRules();

        expect(
            rules.some(({ selectors }) =>
                selectors.some((selector) => selector.endsWith(DANGER_ITEM))
            )
        ).toBe(true);

        const descendantColors = rules
            .filter(({ selectors }) => selectors.some(targetsDangerDescendant))
            .flatMap(({ colors }) => colors);

        expect(descendantColors.filter((color) => color !== "inherit")).toEqual(
            []
        );
    });
});
