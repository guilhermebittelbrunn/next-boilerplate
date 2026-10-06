"use client";

import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { getDictionary } from "@repo/internationalization/client";
import { cn } from "@repo/design-system/lib/utils";
import { Dropdown, Popconfirm } from "antd";
import { MoreVerticalIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

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
    onDelete?: () => void;
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
    const triggerRef = useRef<HTMLButtonElement>(null);
    const cancelButtonId = useId();

    useEffect(() => {
        if (!confirmOpen) {
            return;
        }
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key !== "Escape") {
                return;
            }
            setConfirmOpen(false);
            triggerRef.current?.focus();
        };
        window.addEventListener("keydown", closeOnEscape);
        return () => window.removeEventListener("keydown", closeOnEscape);
    }, [confirmOpen]);

    const returnFocusToTrigger = () => triggerRef.current?.focus();

    return (
        <Popconfirm
            afterOpenChange={(opened) => {
                // Focus moves only after the open animation, so the Enter that
                // opened the confirmation cannot also activate its button.
                if (opened) {
                    document.getElementById(cancelButtonId)?.focus();
                }
            }}
            cancelButtonProps={{ id: cancelButtonId }}
            cancelText={translation.deleteConfirmCancel}
            description={deleteConfirmDescription}
            okText={translation.deleteConfirmOk}
            onCancel={returnFocusToTrigger}
            onConfirm={() => {
                returnFocusToTrigger();
                return onDelete?.();
            }}
            onOpenChange={(nextOpen) => {
                if (!nextOpen) {
                    setConfirmOpen(false);
                }
            }}
            open={confirmOpen}
            placement="bottom"
            title={deleteConfirmTitle}
        >
            <span className="inline-flex">
                <Dropdown
                    autoFocus
                    menu={{
                        items: [
                            ...(onEdit
                                ? [
                                    {
                                        icon: (
                                            <EditOutlined
                                                style={{ scale: 1.25 }}
                                            />
                                        ),
                                        key: "edit",
                                        label: translation.edit,
                                        style: { margin: 4, fontSize: 14 },
                                        onClick: onEdit,
                                    },
                                ]
                                : []),
                            ...(items || []).map((item) => ({
                                ...item,
                                style: {
                                    margin: 4,
                                    fontSize: 14,
                                    ...item.style,
                                },
                            })),
                            ...(onDelete
                                ? [
                                    {
                                        icon: (
                                            <DeleteOutlined
                                                style={{ scale: 1.25 }}
                                            />
                                        ),
                                        key: "delete",
                                        label: deleteAction,
                                        onClick: () => setConfirmOpen(true),
                                        style: { margin: 4, fontSize: 14 },
                                        danger: true,
                                    },
                                ]
                                : []),
                        ],
                    }}
                    onOpenChange={(open) => setMenuOpen(open)}
                    placement="bottomRight"
                    trigger={["click"]}
                >
                    <button
                        aria-expanded={menuOpen}
                        aria-haspopup="menu"
                        aria-label={translation.trigger}
                        className={cn(
                            "flex h-full w-full items-center justify-center rounded-full p-2 outline-none hover:cursor-pointer hover:opacity-40 focus-visible:ring-[3px] focus-visible:ring-ring/50",
                            className,
                        )}
                        ref={triggerRef}
                        type="button"
                    >
                        <MoreVerticalIcon className="h-6 w-6" />
                    </button>
                </Dropdown>
            </span>
        </Popconfirm>
    );
}
