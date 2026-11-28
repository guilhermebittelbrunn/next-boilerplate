"use client";

import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@repo/design-system/components/ui/alert-dialog";
import { Button } from "@repo/design-system/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { cn } from "@repo/design-system/lib/utils";
import { getDictionary } from "@repo/internationalization/client";
import { EllipsisIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

export type ActionMenuItem = {
    icon: React.ReactNode;
    key: string;
    label: string;
    style?: React.CSSProperties;
    onClick?: () => void;
};

export type ActionMenuDeleteLabels = {
    action?: string;
    confirmTitle?: string;
    confirmDescription?: string;
};

const TABLE_ROOT = '[data-slot="table-root"]';
const TABLE_ROW = '[data-slot="table-row"]';
const ROW_ACTIONS_TRIGGER = '[data-slot="actions-menu-trigger"]';
const TABLE_SEARCH = '[data-slot="table-search"]';

type RowPosition = { tableRoot: Element; rowIndex: number };

function findRowPosition(
    trigger: HTMLElement | null,
    confirmContent: HTMLElement | null
): RowPosition | null {
    const focused = document.activeElement;
    const focusWasHere =
        focused !== null &&
        (focused === trigger || Boolean(confirmContent?.contains(focused)));
    const row = trigger?.closest(TABLE_ROW);
    const tableRoot = row?.closest(TABLE_ROOT);
    if (!(focusWasHere && row && tableRoot)) {
        return null;
    }
    const rowIndex = Array.from(tableRoot.querySelectorAll(TABLE_ROW)).indexOf(
        row
    );
    return { tableRoot, rowIndex };
}

function focusRowActionsNear({ tableRoot, rowIndex }: RowPosition) {
    if (!tableRoot.isConnected) {
        return;
    }
    const rows = Array.from(tableRoot.querySelectorAll(TABLE_ROW));
    const triggerAt = (index: number) =>
        rows[index]?.querySelector<HTMLElement>(ROW_ACTIONS_TRIGGER) ?? null;
    for (let index = rowIndex; index < rows.length; index++) {
        const trigger = triggerAt(index);
        if (trigger) {
            trigger.focus();
            return;
        }
    }
    for (let index = Math.min(rowIndex, rows.length) - 1; index >= 0; index--) {
        const trigger = triggerAt(index);
        if (trigger) {
            trigger.focus();
            return;
        }
    }
    tableRoot.querySelector<HTMLElement>(TABLE_SEARCH)?.focus();
}

interface ActionsMenuProps {
    onEdit?: () => void;
    onDelete?: () => unknown;
    deleteLabels?: ActionMenuDeleteLabels;
    items?: ActionMenuItem[];
    className?: string;
}

export function ActionsMenu({
    onEdit,
    onDelete,
    deleteLabels,
    items,
    className,
}: ActionsMenuProps) {
    const { dictionary } = getDictionary();
    const translation = dictionary.components.actionMenu;
    const deleteAction = deleteLabels?.action ?? translation.delete;
    const deleteConfirmTitle =
        deleteLabels?.confirmTitle ?? translation.deleteConfirmTitle;
    const deleteConfirmDescription =
        deleteLabels?.confirmDescription ??
        translation.deleteConfirmDescription;

    const [menuOpen, setMenuOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    // The menu hands focus back to its trigger as it closes; when the delete item is what closed
    // it, the confirmation is opening in the same tick and must keep focus on its cancel button.
    const confirmRequested = useRef(false);
    const confirmContentRef = useRef<HTMLDivElement>(null);
    const rowPositionOnUnmount = useRef<RowPosition | null>(null);

    // Deleting the row drops focus on <body>. Layout cleanup still sees the row, so its position
    // is read there; the move waits a microtask after the passive cleanups, where the dialog
    // releases its focus trap and the aria-hidden it put on the rest of the page.
    useLayoutEffect(() => {
        const trigger = triggerRef.current;
        return () => {
            rowPositionOnUnmount.current = findRowPosition(
                trigger,
                confirmContentRef.current
            );
        };
    }, []);

    useEffect(
        () => () => {
            const position = rowPositionOnUnmount.current;
            if (position) {
                queueMicrotask(() => focusRowActionsNear(position));
            }
        },
        []
    );

    const closeConfirmation = () => {
        if (!deleting) {
            setConfirmOpen(false);
        }
    };

    const confirmDelete = async () => {
        setDeleting(true);
        try {
            await onDelete?.();
        } catch {
            // Reporting the failure is the caller's job; the menu only has to leave the busy state.
        } finally {
            setDeleting(false);
            setConfirmOpen(false);
        }
    };

    const hasLeadingItems = Boolean(onEdit) || Boolean(items?.length);

    return (
        <>
            <DropdownMenu onOpenChange={setMenuOpen} open={menuOpen}>
                <DropdownMenuTrigger asChild>
                    <button
                        aria-label={translation.trigger}
                        className={cn(
                            "pressable inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 data-[state=open]:bg-accent data-[state=open]:text-foreground",
                            className
                        )}
                        data-slot="actions-menu-trigger"
                        ref={triggerRef}
                        type="button"
                    >
                        <EllipsisIcon aria-hidden="true" className="size-4" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="end"
                    className="min-w-44"
                    onCloseAutoFocus={(event) => {
                        if (confirmRequested.current) {
                            confirmRequested.current = false;
                            event.preventDefault();
                        }
                    }}
                >
                    {onEdit ? (
                        <DropdownMenuItem onSelect={onEdit}>
                            <PencilIcon aria-hidden="true" />
                            {translation.edit}
                        </DropdownMenuItem>
                    ) : null}
                    {items?.map((item) => (
                        <DropdownMenuItem
                            key={item.key}
                            onSelect={item.onClick}
                            style={item.style}
                        >
                            {item.icon}
                            {item.label}
                        </DropdownMenuItem>
                    ))}
                    {onDelete ? (
                        <>
                            {hasLeadingItems ? <DropdownMenuSeparator /> : null}
                            <DropdownMenuItem
                                onSelect={() => {
                                    confirmRequested.current = true;
                                    setConfirmOpen(true);
                                }}
                                variant="destructive"
                            >
                                <Trash2Icon aria-hidden="true" />
                                {deleteAction}
                            </DropdownMenuItem>
                        </>
                    ) : null}
                </DropdownMenuContent>
            </DropdownMenu>

            {onDelete ? (
                <AlertDialog
                    onOpenChange={(open) => {
                        if (!open) {
                            closeConfirmation();
                        }
                    }}
                    open={confirmOpen}
                >
                    <AlertDialogContent
                        onCloseAutoFocus={(event) => {
                            event.preventDefault();
                            triggerRef.current?.focus();
                        }}
                        ref={confirmContentRef}
                        size="sm"
                    >
                        <AlertDialogHeader>
                            <AlertDialogTitle>{deleteConfirmTitle}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {deleteConfirmDescription}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={deleting}>
                                {translation.deleteConfirmCancel}
                            </AlertDialogCancel>
                            <Button
                                loading={deleting}
                                onClick={confirmDelete}
                                type="button"
                                variant="destructive"
                            >
                                {translation.deleteConfirmOk}
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            ) : null}
        </>
    );
}
