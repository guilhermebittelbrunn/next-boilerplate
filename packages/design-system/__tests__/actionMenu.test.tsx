import { ActionsMenu } from "@repo/design-system/components/ui/action-menu";
import { Table } from "@repo/design-system/components/ui/table";
import { getDictionary } from "@repo/internationalization/client";
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const actionMenuCopy = getDictionary().dictionary.components.actionMenu;
const tableCopy = getDictionary().dictionary.components.table;

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

    it("blocks cancel and Escape while an async onDelete is running", async () => {
        let resolveDelete: (() => void) | undefined;
        const onDelete = vi.fn(
            () =>
                new Promise<void>((resolve) => {
                    resolveDelete = resolve;
                })
        );
        render(<ActionsMenu onDelete={onDelete} onEdit={vi.fn()} />);

        await openConfirmationFromKeyboard();
        act(() => {
            fireEvent.click(getDialogButton(actionMenuCopy.deleteConfirmOk));
        });

        const cancelButton = getDialogButton(
            actionMenuCopy.deleteConfirmCancel
        );
        await waitFor(() =>
            expect(cancelButton.hasAttribute("disabled")).toBe(true)
        );

        fireEvent.keyDown(screen.getByRole("alertdialog"), ESCAPE);
        expect(screen.queryByRole("alertdialog")).not.toBeNull();

        await act(async () => {
            resolveDelete?.();
            await Promise.resolve();
        });
        await waitFor(() =>
            expect(screen.queryByRole("alertdialog")).toBeNull()
        );
    });

    it("absorbs a rejected onDelete, leaves the busy state, closes and returns focus to the trigger", async () => {
        const unhandled = vi.fn();
        process.on("unhandledRejection", unhandled);
        let rejectDelete: ((reason: Error) => void) | undefined;
        const onDelete = vi.fn(
            () =>
                new Promise<void>((_, reject) => {
                    rejectDelete = reject;
                })
        );
        try {
            render(<ActionsMenu onDelete={onDelete} onEdit={vi.fn()} />);

            const trigger = await openConfirmationFromKeyboard();
            const confirmButton = getDialogButton(
                actionMenuCopy.deleteConfirmOk
            );
            act(() => {
                fireEvent.click(confirmButton);
            });
            await waitFor(() =>
                expect(confirmButton.getAttribute("aria-busy")).toBe("true")
            );

            await act(async () => {
                rejectDelete?.(new Error("delete failed"));
                await Promise.resolve();
            });

            await waitFor(() =>
                expect(screen.queryByRole("alertdialog")).toBeNull()
            );
            expect(confirmButton.getAttribute("aria-busy")).not.toBe("true");
            await waitFor(() => expect(document.activeElement).toBe(trigger));
            await new Promise((resolve) => setTimeout(resolve, 0));
            expect(unhandled).not.toHaveBeenCalled();
            expect(onDelete).toHaveBeenCalledTimes(1);
        } finally {
            process.off("unhandledRejection", unhandled);
        }
    });

    it("absorbs an onDelete that throws synchronously, closes and returns focus to the trigger", async () => {
        const unhandled = vi.fn();
        process.on("unhandledRejection", unhandled);
        const onDelete = vi.fn(() => {
            throw new Error("delete failed");
        });
        try {
            render(<ActionsMenu onDelete={onDelete} onEdit={vi.fn()} />);

            const trigger = await openConfirmationFromKeyboard();
            const confirmButton = getDialogButton(
                actionMenuCopy.deleteConfirmOk
            );
            await act(async () => {
                fireEvent.click(confirmButton);
                await Promise.resolve();
            });

            await waitFor(() =>
                expect(screen.queryByRole("alertdialog")).toBeNull()
            );
            expect(confirmButton.getAttribute("aria-busy")).not.toBe("true");
            await waitFor(() => expect(document.activeElement).toBe(trigger));
            await new Promise((resolve) => setTimeout(resolve, 0));
            expect(unhandled).not.toHaveBeenCalled();
            expect(onDelete).toHaveBeenCalledTimes(1);
        } finally {
            process.off("unhandledRejection", unhandled);
        }
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

type HarnessRow = Record<string, unknown> & {
    id: string;
    name: string;
    withActions?: boolean;
};

type DeleteMode = "remove" | "keep" | "defer";

const deferredRemovals: (() => void)[] = [];

function TableWithRowActions(props: {
    initialRows: HarnessRow[];
    deleteMode?: DeleteMode;
    searchable?: boolean;
}) {
    const { initialRows, deleteMode = "remove", searchable = false } = props;
    const [rows, setRows] = useState(initialRows);
    const removeRow = (id: string) =>
        setRows((current) => current.filter((row) => row.id !== id));

    return (
        <Table<HarnessRow>
            columns={[
                { dataIndex: "name", title: "Nome" },
                {
                    dataIndex: "actions",
                    render: (_: unknown, record: HarnessRow) =>
                        record.withActions === false ? null : (
                            <ActionsMenu
                                onDelete={() => {
                                    if (deleteMode === "remove") {
                                        removeRow(record.id);
                                    }
                                    if (deleteMode === "defer") {
                                        deferredRemovals.push(() =>
                                            removeRow(record.id)
                                        );
                                    }
                                }}
                            />
                        ),
                },
            ]}
            dataSource={rows}
            pagination={false}
            rowKey="id"
            searchFields={searchable ? ["name"] : undefined}
        />
    );
}

function buildHarnessRows(names: string[]): HarnessRow[] {
    return names.map((name) => ({ id: name, name }));
}

function rowTrigger(name: string) {
    const row = screen.getByText(name).closest("tr");
    if (!row) {
        throw new Error(`row "${name}" not found`);
    }
    return within(row).getByRole("button", { name: actionMenuCopy.trigger });
}

async function confirmDeleteFromKeyboard(name: string) {
    const trigger = rowTrigger(name);
    trigger.focus();
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
    await pressEnterOn(actionMenuCopy.delete);
    await screen.findByRole("alertdialog");
    const confirmButton = getDialogButton(actionMenuCopy.deleteConfirmOk);
    confirmButton.focus();
    await act(async () => {
        fireEvent.click(confirmButton);
        await Promise.resolve();
    });
}

/** Radix hands focus back from a closed dialog in a 0 ms timeout; let it run before asserting. */
async function flushDialogFocusReturn() {
    await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
    });
}

describe("ActionsMenu focus after its table row is deleted", () => {
    afterEach(() => {
        deferredRemovals.length = 0;
    });

    it("moves focus to the trigger of the row that took the deleted row's place", async () => {
        render(
            <TableWithRowActions
                initialRows={buildHarnessRows(["Alfa", "Bravo", "Charlie"])}
            />
        );

        await confirmDeleteFromKeyboard("Bravo");
        await flushDialogFocusReturn();

        expect(screen.queryByText("Bravo")).toBeNull();
        expect(screen.queryByRole("alertdialog")).toBeNull();
        expect(document.activeElement).toBe(rowTrigger("Charlie"));
    });

    it("moves focus to the previous row when the deleted row was the last one", async () => {
        render(
            <TableWithRowActions
                initialRows={buildHarnessRows(["Alfa", "Bravo", "Charlie"])}
            />
        );

        await confirmDeleteFromKeyboard("Charlie");
        await flushDialogFocusReturn();

        expect(document.activeElement).toBe(rowTrigger("Bravo"));
    });

    it("skips a neighbour without row actions", async () => {
        render(
            <TableWithRowActions
                initialRows={[
                    { id: "Alfa", name: "Alfa" },
                    { id: "Bravo", name: "Bravo" },
                    { id: "Charlie", name: "Charlie", withActions: false },
                ]}
            />
        );

        await confirmDeleteFromKeyboard("Bravo");
        await flushDialogFocusReturn();

        expect(document.activeElement).toBe(rowTrigger("Alfa"));
    });

    it("moves focus to the table search when the only row is deleted", async () => {
        render(
            <TableWithRowActions
                initialRows={buildHarnessRows(["Alfa"])}
                searchable
            />
        );

        await confirmDeleteFromKeyboard("Alfa");
        await flushDialogFocusReturn();

        expect(document.activeElement).toBe(
            screen.getByRole("searchbox", { name: tableCopy.searchLabel })
        );
    });

    it("leaves focus alone when the only row is deleted and the table has no search", async () => {
        render(
            <TableWithRowActions initialRows={buildHarnessRows(["Alfa"])} />
        );

        await confirmDeleteFromKeyboard("Alfa");
        await flushDialogFocusReturn();

        expect(document.activeElement).toBe(document.body);
    });

    it("moves focus to the next row when the row leaves after the dialog already returned focus to its trigger", async () => {
        render(
            <TableWithRowActions
                deleteMode="defer"
                initialRows={buildHarnessRows(["Alfa", "Bravo", "Charlie"])}
            />
        );

        await confirmDeleteFromKeyboard("Bravo");
        await waitFor(() =>
            expect(screen.queryByRole("alertdialog")).toBeNull()
        );
        await waitFor(() =>
            expect(document.activeElement).toBe(rowTrigger("Bravo"))
        );

        await act(async () => {
            for (const removeRow of deferredRemovals) {
                removeRow();
            }
            await Promise.resolve();
        });
        await flushDialogFocusReturn();

        expect(screen.queryByText("Bravo")).toBeNull();
        expect(document.activeElement).toBe(rowTrigger("Charlie"));
    });

    it("keeps focus on the trigger when the row survives the delete", async () => {
        render(
            <TableWithRowActions
                deleteMode="keep"
                initialRows={buildHarnessRows(["Alfa", "Bravo", "Charlie"])}
            />
        );

        await confirmDeleteFromKeyboard("Bravo");
        await waitFor(() =>
            expect(screen.queryByRole("alertdialog")).toBeNull()
        );
        await waitFor(() =>
            expect(document.activeElement).toBe(rowTrigger("Bravo"))
        );
    });

    it("returns focus to the row's own trigger on cancel", async () => {
        render(
            <TableWithRowActions
                initialRows={buildHarnessRows(["Alfa", "Bravo", "Charlie"])}
            />
        );

        const trigger = rowTrigger("Bravo");
        trigger.focus();
        fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
        await pressEnterOn(actionMenuCopy.delete);
        await screen.findByRole("alertdialog");
        fireEvent.click(getDialogButton(actionMenuCopy.deleteConfirmCancel));

        await waitFor(() =>
            expect(screen.queryByRole("alertdialog")).toBeNull()
        );
        await waitFor(() => expect(document.activeElement).toBe(trigger));
        expect(screen.getByText("Bravo")).toBeTruthy();
    });

    it("leaves focus on the next screen when the whole table unmounts with focus on a row trigger", async () => {
        function ListThenForm() {
            const [showForm, setShowForm] = useState(false);
            return showForm ? (
                <input aria-label="Nome" autoFocus />
            ) : (
                <>
                    <button onClick={() => setShowForm(true)} type="button">
                        Abrir formulário
                    </button>
                    <TableWithRowActions
                        initialRows={buildHarnessRows(["Alfa", "Bravo"])}
                    />
                </>
            );
        }

        render(<ListThenForm />);
        const trigger = rowTrigger("Alfa");
        trigger.focus();

        await act(async () => {
            screen.getByRole("button", { name: "Abrir formulário" }).click();
            await Promise.resolve();
        });
        await flushDialogFocusReturn();

        expect(screen.queryByRole("table")).toBeNull();
        expect(document.activeElement).toBe(
            screen.getByRole("textbox", { name: "Nome" })
        );
    });
});
