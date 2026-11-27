import { ActionsMenu } from "@repo/design-system/components/ui/action-menu";
import { getDictionary } from "@repo/internationalization/client";
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const actionMenuCopy = getDictionary().dictionary.components.actionMenu;

const ENTER = { key: "Enter", code: "Enter", keyCode: 13, which: 13 };
const ESCAPE = { key: "Escape", code: "Escape", keyCode: 27, which: 27 };

afterEach(cleanup);

function getTrigger() {
    return screen.getByRole("button", { name: actionMenuCopy.trigger });
}

/** Radix opens the menu on `pointerdown`, which jsdom's `click` never emits. */
function openMenu() {
    const trigger = getTrigger();
    trigger.focus();
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
    return trigger;
}

async function findMenuItem(label: string) {
    const text = await screen.findByText(label);
    const item = text.closest('[role="menuitem"]');
    if (!item) {
        throw new Error(`menu item "${label}" not found`);
    }
    return item as HTMLElement;
}

async function pressEnterOn(label: string) {
    const item = await findMenuItem(label);
    item.focus();
    return fireEvent.keyDown(item, ENTER);
}

async function openConfirmationFromKeyboard() {
    const trigger = openMenu();
    await pressEnterOn(actionMenuCopy.delete);
    await screen.findByRole("alertdialog");
    return trigger;
}

function getDialogButton(label: string) {
    return screen.getByRole("button", { name: label });
}

describe("ActionsMenu", () => {
    it("renders the trigger as a named, focusable button", () => {
        render(<ActionsMenu onDelete={vi.fn()} onEdit={vi.fn()} />);

        const trigger = getTrigger();
        expect(trigger.getAttribute("type")).toBe("button");

        trigger.focus();
        expect(document.activeElement).toBe(trigger);
    });

    it("announces the menu through aria-haspopup and aria-expanded", async () => {
        render(<ActionsMenu onDelete={vi.fn()} onEdit={vi.fn()} />);

        const trigger = getTrigger();
        expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
        expect(trigger.getAttribute("aria-expanded")).toBe("false");

        openMenu();
        await waitFor(() =>
            expect(trigger.getAttribute("aria-expanded")).toBe("true")
        );
    });

    it("opens the menu with edit and delete", async () => {
        render(<ActionsMenu onDelete={vi.fn()} onEdit={vi.fn()} />);

        openMenu();

        expect(await findMenuItem(actionMenuCopy.edit)).toBeTruthy();
        expect(await findMenuItem(actionMenuCopy.delete)).toBeTruthy();
    });

    it("runs edit without opening the confirmation", async () => {
        const onEdit = vi.fn();
        render(<ActionsMenu onDelete={vi.fn()} onEdit={onEdit} />);

        openMenu();
        await pressEnterOn(actionMenuCopy.edit);

        expect(onEdit).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole("alertdialog")).toBeNull();
    });

    it("cancels the Enter keydown that runs an item, so it cannot activate what the item focuses", async () => {
        const onOpenDialog = vi.fn();
        render(
            <ActionsMenu
                items={[
                    {
                        icon: null,
                        key: "open-dialog",
                        label: "Open dialog",
                        onClick: onOpenDialog,
                    },
                ]}
                onDelete={vi.fn()}
            />
        );

        openMenu();

        expect(await pressEnterOn("Open dialog")).toBe(false);
        expect(onOpenDialog).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole("alertdialog")).toBeNull();
    });

    it("offers no delete item without onDelete", async () => {
        render(<ActionsMenu onEdit={vi.fn()} />);

        openMenu();
        await findMenuItem(actionMenuCopy.edit);

        expect(screen.queryByText(actionMenuCopy.delete)).toBeNull();
    });
});

describe("ActionsMenu delete confirmation", () => {
    it("opens the confirmation from the delete item without deleting", async () => {
        const onDelete = vi.fn();
        render(<ActionsMenu onDelete={onDelete} onEdit={vi.fn()} />);

        await openConfirmationFromKeyboard();

        expect(
            screen.getByText(actionMenuCopy.deleteConfirmTitle)
        ).toBeTruthy();
        expect(onDelete).not.toHaveBeenCalled();
    });

    it("moves focus to the cancel button once the confirmation opens", async () => {
        render(<ActionsMenu onDelete={vi.fn()} onEdit={vi.fn()} />);

        await openConfirmationFromKeyboard();

        await waitFor(() =>
            expect(document.activeElement).toBe(
                getDialogButton(actionMenuCopy.deleteConfirmCancel)
            )
        );
    });

    it("closes on Escape and returns focus to the trigger", async () => {
        const onDelete = vi.fn();
        render(<ActionsMenu onDelete={onDelete} onEdit={vi.fn()} />);

        const trigger = await openConfirmationFromKeyboard();
        fireEvent.keyDown(document.activeElement ?? document.body, ESCAPE);

        await waitFor(() =>
            expect(screen.queryByRole("alertdialog")).toBeNull()
        );
        await waitFor(() => expect(document.activeElement).toBe(trigger));
        expect(onDelete).not.toHaveBeenCalled();
    });

    it("returns focus to the trigger on cancel", async () => {
        const onDelete = vi.fn();
        render(<ActionsMenu onDelete={onDelete} onEdit={vi.fn()} />);

        const trigger = await openConfirmationFromKeyboard();
        fireEvent.click(getDialogButton(actionMenuCopy.deleteConfirmCancel));

        await waitFor(() =>
            expect(screen.queryByRole("alertdialog")).toBeNull()
        );
        await waitFor(() => expect(document.activeElement).toBe(trigger));
        expect(onDelete).not.toHaveBeenCalled();
    });

    it("calls onDelete once on confirm and returns focus to the trigger", async () => {
        const onDelete = vi.fn();
        render(<ActionsMenu onDelete={onDelete} onEdit={vi.fn()} />);

        const trigger = await openConfirmationFromKeyboard();
        act(() => {
            fireEvent.click(getDialogButton(actionMenuCopy.deleteConfirmOk));
        });

        await waitFor(() =>
            expect(screen.queryByRole("alertdialog")).toBeNull()
        );
        expect(onDelete).toHaveBeenCalledTimes(1);
        await waitFor(() => expect(document.activeElement).toBe(trigger));
    });

    it("keeps the dialog open and the confirm button busy until an async onDelete resolves", async () => {
        let resolveDelete: (() => void) | undefined;
        const onDelete = vi.fn(
            () =>
                new Promise<void>((resolve) => {
                    resolveDelete = resolve;
                })
        );
        render(<ActionsMenu onDelete={onDelete} onEdit={vi.fn()} />);

        await openConfirmationFromKeyboard();
        const confirmButton = getDialogButton(actionMenuCopy.deleteConfirmOk);
        act(() => {
            fireEvent.click(confirmButton);
        });

        expect(onDelete).toHaveBeenCalledTimes(1);
        await waitFor(() =>
            expect(confirmButton.getAttribute("aria-busy")).toBe("true")
        );
        expect(screen.queryByRole("alertdialog")).not.toBeNull();

        await act(async () => {
            resolveDelete?.();
            await Promise.resolve();
        });

        await waitFor(() =>
            expect(screen.queryByRole("alertdialog")).toBeNull()
        );
        expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it("uses the custom delete labels", async () => {
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
