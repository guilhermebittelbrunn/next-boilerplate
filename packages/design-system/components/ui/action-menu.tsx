"use client";

import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { getDictionary } from "@repo/internationalization/client";
import { cn } from "@repo/design-system/lib/utils";
import { Dropdown, Popconfirm } from "antd";
import { MoreVerticalIcon } from "lucide-react";

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

    return (
        <Dropdown
            trigger={["click"]}
            placement="bottomRight"
            menu={{
                items: [
                    ...(onEdit
                        ? [
                            {
                                icon: (
                                    <EditOutlined style={{ scale: 1.25 }} />
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
                                label: (
                                    <Popconfirm
                                        title={deleteConfirmTitle}
                                        description={deleteConfirmDescription}
                                        onConfirm={onDelete}
                                        okText={translation.deleteConfirmOk}
                                        cancelText={translation.deleteConfirmCancel}
                                        className="flex items-center justify-between gap-2 "
                                    >
                                        <span>{deleteAction}</span>
                                    </Popconfirm>
                                ),
                                style: { margin: 4, fontSize: 14 },
                                danger: true,
                            },
                        ]
                        : []),
                ],
            }}
        >
            <div
                className={cn(
                    "flex h-full w-full items-center justify-center rounded-full p-2 hover:cursor-pointer hover:opacity-40",
                    className,
                )}
            >
                <MoreVerticalIcon className="h-6 w-6" />
            </div>
        </Dropdown>
    );
}
