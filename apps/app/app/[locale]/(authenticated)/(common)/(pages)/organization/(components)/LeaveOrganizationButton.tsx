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
import { SettingsSection } from "@/shared/components/ui/SettingsSection";
import { useAuthRequestPanel } from "@/shared/providers/AuthRequestPanelContext";
import { useOrganizationActions } from "../(hooks)/useOrganizationActions";

export function LeaveOrganizationButton() {
    const { dictionary } = getDictionary();
    const { isImpersonating } = useAuthRequestPanel();
    const { leaveMutation } = useOrganizationActions();
    const leaveCopy = dictionary.apps.app.pages.common.organization.leave;

    return (
        <SettingsSection
            description={leaveCopy.description}
            headingLevel={2}
            title={leaveCopy.title}
            tone="destructive"
        >
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
                            variant="destructive"
                        >
                            {leaveCopy.confirm}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </SettingsSection>
    );
}
