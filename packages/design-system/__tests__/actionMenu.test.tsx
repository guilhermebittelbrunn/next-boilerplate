import { readFileSync } from "node:fs";
import path from "node:path";
import { ActionsMenu } from "@repo/design-system/components/ui/action-menu";
import { AntdAppProvider } from "@repo/design-system/providers/antd-app";
import { getDictionary } from "@repo/internationalization/client";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const actionMenuCopy = getDictionary().dictionary.components.actionMenu;

const CSS_COMMENT = /\/\*[\s\S]*?\*\//g;
const CSS_RULE = /([^{}]+)\{([^{}]*)\}/g;
const COLOR_DECLARATION = /(?:^|;)\s*color\s*:\s*([^;]+)/g;
const WHITESPACE_RUN = /\s+/g;
const DANGER_ITEM = ".ant-dropdown-menu-item-danger";
const ENTER = { key: "Enter", code: "Enter", keyCode: 13, which: 13 };
const ESCAPE = { key: "Escape", code: "Escape", keyCode: 27, which: 27 };

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

function openMenu() {
    const trigger = screen.getByRole("button", {
        name: actionMenuCopy.trigger,
    });
    fireEvent.click(trigger);
    return trigger;
}

async function findMenuItem(label: string) {
    const text = await screen.findByText(label);
    const item = text.closest('[role="menuitem"]');
    if (!item) {
        throw new Error(`menu item "${label}" not found`);
    }
    return item;
}

async function pressEnterOn(label: string) {
    const item = await findMenuItem(label);
    await waitFor(() =>
        expect(
            item.closest('[role="menu"]')?.contains(document.activeElement)
        ).toBe(true)
    );
    fireEvent.keyDown(item, ENTER);
}

async function openConfirmationFromKeyboard() {
    const trigger = openMenu();
    await pressEnterOn(actionMenuCopy.delete);
    await screen.findByText(actionMenuCopy.deleteConfirmTitle);
    return trigger;
}

function getConfirmButton(label: string) {
    const button = screen
        .getAllByText(label)
        .map((node) => node.closest("button"))
        .find((node): node is HTMLButtonElement => node !== null);
    if (!button) {
        throw new Error(`confirmation button "${label}" not found`);
    }
    return button;
}

describe("ActionsMenu keyboard delete", () => {
    it("opens the confirmation when Enter is pressed on the delete item", async () => {
        const onDelete = vi.fn();
        render(<ActionsMenu onDelete={onDelete} onEdit={vi.fn()} />);

        openMenu();
        await pressEnterOn(actionMenuCopy.delete);

        expect(
            await screen.findByText(actionMenuCopy.deleteConfirmTitle)
        ).toBeTruthy();
        expect(onDelete).not.toHaveBeenCalled();
    });

    it("moves focus to the cancel button once the confirmation opens", async () => {
        render(<ActionsMenu onDelete={vi.fn()} onEdit={vi.fn()} />);

        await openConfirmationFromKeyboard();

        await waitFor(() =>
            expect(document.activeElement).toBe(
                getConfirmButton(actionMenuCopy.deleteConfirmCancel)
            )
        );
    });

    it("closes on Escape and returns focus to the trigger", async () => {
        const onDelete = vi.fn();
        render(<ActionsMenu onDelete={onDelete} onEdit={vi.fn()} />);

        const trigger = await openConfirmationFromKeyboard();
        fireEvent.keyDown(window, ESCAPE);

        await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
        expect(document.activeElement).toBe(trigger);
        expect(onDelete).not.toHaveBeenCalled();
    });

    it("returns focus to the trigger on cancel", async () => {
        const onDelete = vi.fn();
        render(<ActionsMenu onDelete={onDelete} onEdit={vi.fn()} />);

        const trigger = await openConfirmationFromKeyboard();
        fireEvent.click(getConfirmButton(actionMenuCopy.deleteConfirmCancel));

        await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
        expect(document.activeElement).toBe(trigger);
        expect(onDelete).not.toHaveBeenCalled();
    });

    it("calls onDelete once on confirm and returns focus to the trigger", async () => {
        const onDelete = vi.fn();
        render(<ActionsMenu onDelete={onDelete} onEdit={vi.fn()} />);

        const trigger = await openConfirmationFromKeyboard();
        fireEvent.click(getConfirmButton(actionMenuCopy.deleteConfirmOk));

        await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
        expect(onDelete).toHaveBeenCalledTimes(1);
        expect(document.activeElement).toBe(trigger);
    });

    it("still opens the confirmation on mouse click", async () => {
        const onDelete = vi.fn();
        render(<ActionsMenu onDelete={onDelete} onEdit={vi.fn()} />);

        openMenu();
        fireEvent.click(await findMenuItem(actionMenuCopy.delete));

        expect(
            await screen.findByText(actionMenuCopy.deleteConfirmTitle)
        ).toBeTruthy();
        expect(onDelete).not.toHaveBeenCalled();
    });

    it("does not open the confirmation from the edit item", async () => {
        const onEdit = vi.fn();
        render(<ActionsMenu onDelete={vi.fn()} onEdit={onEdit} />);

        openMenu();
        await pressEnterOn(actionMenuCopy.edit);

        expect(onEdit).toHaveBeenCalledTimes(1);
        expect(
            screen.queryByText(actionMenuCopy.deleteConfirmTitle)
        ).toBeNull();
    });

    it("announces the menu through aria-haspopup and aria-expanded", async () => {
        render(<ActionsMenu onDelete={vi.fn()} onEdit={vi.fn()} />);

        const trigger = screen.getByRole("button", {
            name: actionMenuCopy.trigger,
        });
        expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
        expect(trigger.getAttribute("aria-expanded")).toBe("false");

        openMenu();
        await waitFor(() =>
            expect(trigger.getAttribute("aria-expanded")).toBe("true")
        );

        await pressEnterOn(actionMenuCopy.edit);
        await waitFor(() =>
            expect(trigger.getAttribute("aria-expanded")).toBe("false")
        );
    });

    it("uses the custom delete labels from the keyboard path", async () => {
        const onDelete = vi.fn();
        render(
            <ActionsMenu
                deleteLabels={{
                    action: "Archive",
                    confirmTitle: "Archive this account?",
                    confirmDescription: "The account can be restored later.",
                }}
                onDelete={onDelete}
            />
        );

        openMenu();
        await pressEnterOn("Archive");

        expect(await screen.findByText("Archive this account?")).toBeTruthy();
        expect(
            screen.getByText("The account can be restored later.")
        ).toBeTruthy();
        expect(onDelete).not.toHaveBeenCalled();
    });
});

describe("ActionsMenu delete confirmation edges", () => {
    it("keeps the confirm button loading until an async onDelete resolves", async () => {
        let resolveDelete: (() => void) | undefined;
        const onDelete = vi.fn(
            () =>
                new Promise<void>((resolve) => {
                    resolveDelete = resolve;
                })
        );
        render(<ActionsMenu onDelete={onDelete} onEdit={vi.fn()} />);

        await openConfirmationFromKeyboard();
        const confirmButton = getConfirmButton(actionMenuCopy.deleteConfirmOk);
        fireEvent.click(confirmButton);

        expect(onDelete).toHaveBeenCalledTimes(1);
        await waitFor(() =>
            expect(
                confirmButton.querySelector('[aria-label="loading"]')
            ).not.toBeNull()
        );
        expect(screen.queryByRole("tooltip")).not.toBeNull();

        resolveDelete?.();

        await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
        expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it("offers no delete item and no confirmation without onDelete", async () => {
        const onEdit = vi.fn();
        render(<ActionsMenu onEdit={onEdit} />);

        openMenu();
        await findMenuItem(actionMenuCopy.edit);

        expect(screen.queryByText(actionMenuCopy.delete)).toBeNull();

        await pressEnterOn(actionMenuCopy.edit);

        expect(onEdit).toHaveBeenCalledTimes(1);
        expect(
            screen.queryByText(actionMenuCopy.deleteConfirmTitle)
        ).toBeNull();
    });

    it("runs a custom item's handler without opening the confirmation", async () => {
        const onApprove = vi.fn();
        const onDelete = vi.fn();
        render(
            <ActionsMenu
                items={[
                    {
                        icon: null,
                        key: "approve",
                        label: "Approve",
                        onClick: onApprove,
                    },
                ]}
                onDelete={onDelete}
            />
        );

        openMenu();
        await pressEnterOn("Approve");

        expect(onApprove).toHaveBeenCalledTimes(1);
        expect(
            screen.queryByText(actionMenuCopy.deleteConfirmTitle)
        ).toBeNull();

        openMenu();
        fireEvent.click(await findMenuItem("Approve"));

        expect(onApprove).toHaveBeenCalledTimes(2);
        expect(
            screen.queryByText(actionMenuCopy.deleteConfirmTitle)
        ).toBeNull();
        expect(onDelete).not.toHaveBeenCalled();
    });

    it("closes the confirmation on a click outside without deleting", async () => {
        const onDelete = vi.fn();
        render(
            <div>
                <p>outside</p>
                <ActionsMenu onDelete={onDelete} onEdit={vi.fn()} />
            </div>
        );

        await openConfirmationFromKeyboard();
        expect(screen.queryByRole("tooltip")).not.toBeNull();

        const outside = screen.getByText("outside");
        fireEvent.mouseDown(outside);
        fireEvent.click(outside);

        await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
        expect(onDelete).not.toHaveBeenCalled();
    });

    it("closes the confirmation and reopens the menu when the trigger is clicked", async () => {
        const onDelete = vi.fn();
        render(<ActionsMenu onDelete={onDelete} onEdit={vi.fn()} />);

        const trigger = await openConfirmationFromKeyboard();
        fireEvent.mouseDown(trigger);
        fireEvent.click(trigger);

        await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
        await waitFor(() =>
            expect(trigger.getAttribute("aria-expanded")).toBe("true")
        );
        expect(onDelete).not.toHaveBeenCalled();
    });

    it("closes the open menu on Escape and returns focus to the trigger", async () => {
        render(<ActionsMenu onDelete={vi.fn()} onEdit={vi.fn()} />);

        const trigger = openMenu();
        const item = await findMenuItem(actionMenuCopy.delete);
        await waitFor(() =>
            expect(
                item.closest('[role="menu"]')?.contains(document.activeElement)
            ).toBe(true)
        );
        expect(trigger.getAttribute("aria-expanded")).toBe("true");

        fireEvent.keyDown(window, ESCAPE);

        await waitFor(() =>
            expect(trigger.getAttribute("aria-expanded")).toBe("false")
        );
        expect(document.activeElement).toBe(trigger);
        expect(
            screen.queryByText(actionMenuCopy.deleteConfirmTitle)
        ).toBeNull();
    });
});
