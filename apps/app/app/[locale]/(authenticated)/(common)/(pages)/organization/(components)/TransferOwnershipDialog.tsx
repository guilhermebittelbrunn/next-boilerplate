"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@repo/design-system/components/ui/alert-dialog";
import { getDictionary } from "@repo/internationalization/client";
import type { OrganizationMemberDTO } from "@repo/sdk/src/types";
import type { RefObject } from "react";

type TransferOwnershipDialogProps = {
    /** Kept after closing, so the name does not vanish during the closing animation. */
    readonly member: OrganizationMemberDTO | null;
    readonly open: boolean;
    readonly onOpenChange: (open: boolean) => void;
    readonly onConfirm: (member: OrganizationMemberDTO) => void;
    readonly returnFocusRef: RefObject<HTMLElement | null>;
};

export function TransferOwnershipDialog({
    member,
    open,
    onOpenChange,
    onConfirm,
    returnFocusRef,
}: TransferOwnershipDialogProps) {
    const { dictionary } = getDictionary();
    const organizationCopy = dictionary.apps.app.pages.common.organization;
    const transferCopy = organizationCopy.transfer;
    const memberName = member
        ? (member.displayName ??
          member.email ??
          organizationCopy.members.unnamed)
        : "";

    // The dialog is opened from a menu item, not from an AlertDialogTrigger, so Radix has
    // no trigger to hand focus back to on close and would drop it on <body>.
    const handleCloseAutoFocus = (event: Event) => {
        event.preventDefault();
        returnFocusRef.current?.focus();
    };

    return (
        <AlertDialog onOpenChange={onOpenChange} open={open && member !== null}>
            <AlertDialogContent onCloseAutoFocus={handleCloseAutoFocus}>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {transferCopy.confirmTitle}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {transferCopy.confirmDescription.replaceAll(
                            "{name}",
                            memberName
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{transferCopy.cancel}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => {
                            if (member) {
                                onConfirm(member);
                            }
                        }}
                    >
                        {transferCopy.confirm}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
