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
    AlertDialogTrigger,
} from "@repo/design-system/components/ui/alert-dialog";
import { Button } from "@repo/design-system/components/ui/button";
import { getDictionary } from "@repo/internationalization/client";
import { useAuthRequestPanel } from "@/shared/providers/AuthRequestPanelContext";
import { useOrganizationActions } from "../(hooks)/useOrganizationActions";

export function LeaveOrganizationButton() {
    const { dictionary } = getDictionary();
    const { isImpersonating } = useAuthRequestPanel();
    const { leaveMutation } = useOrganizationActions();
    const leaveCopy = dictionary.apps.app.pages.common.organization.leave;

    return (
        <section className="flex flex-col gap-2 rounded-lg border border-border p-4">
            <h2 className="font-semibold text-lg">{leaveCopy.title}</h2>
            <p className="text-muted-foreground text-sm">
                {leaveCopy.description}
            </p>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button
                        className="self-start"
                        disabled={isImpersonating || leaveMutation.isPending}
                        loading={leaveMutation.isPending}
                        type="button"
                        variant="destructive"
                    >
                        {leaveCopy.action}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {leaveCopy.confirmTitle}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {leaveCopy.confirmDescription}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>
                            {leaveCopy.cancel}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => leaveMutation.mutate()}
                        >
                            {leaveCopy.confirm}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </section>
    );
}
