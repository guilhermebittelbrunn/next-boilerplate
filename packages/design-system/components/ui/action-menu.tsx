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
import { useRef, useState } from "react";

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

    const closeConfirmation = () => {
        if (!deleting) {
            setConfirmOpen(false);
        }
    };

    const confirmDelete = async () => {
        setDeleting(true);
        try {
            await onDelete?.();
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
