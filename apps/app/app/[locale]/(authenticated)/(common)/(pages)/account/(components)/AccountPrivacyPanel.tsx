"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { HookFormInputPassword } from "@repo/design-system/components/form/hookform";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@repo/design-system/components/ui/alert-dialog";
import { Button } from "@repo/design-system/components/ui/button";
import { Form } from "@repo/design-system/components/ui/form";
import { getDictionary } from "@repo/internationalization/client";
import type { AccountDTO } from "@repo/sdk/src/types";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { FormContainer } from "@/shared/components/ui/FormContainer";
import { SettingsSection } from "@/shared/components/ui/SettingsSection";
import { privacyPolicyUrl } from "@/shared/lib/privacyPolicyUrl";
import { lacksPasswordProvider } from "@/shared/lib/signInMethods";
import { useAuthRequestPanel } from "@/shared/providers/AuthRequestPanelContext";
import { useAccountDataRights } from "../(hooks)/useAccountDataRights";
import {
    type AccountDeletionFormValues,
    buildAccountDeletionSchema,
} from "../(validations)/accountDeletionSchema";

type AccountPrivacyPanelProps = {
    account: AccountDTO | undefined;
};

export function AccountPrivacyPanel({ account }: AccountPrivacyPanelProps) {
    const { dictionary, locale } = getDictionary();
    const { isImpersonating } = useAuthRequestPanel();
    const privacyCopy = dictionary.apps.app.pages.common.account.privacy;
    const deleteCopy = privacyCopy.delete;
    const { exportDataMutation, deleteAccountMutation } =
        useAccountDataRights();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const policyHref = privacyPolicyUrl(locale);
    const askPrivacyChannel = lacksPasswordProvider(account);

    const schema = useMemo(
        () => buildAccountDeletionSchema(dictionary),
        [dictionary]
    );

    const form = useForm<AccountDeletionFormValues>({
        resolver: zodResolver(schema),
        defaultValues: { currentPassword: "" },
    });

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            form.reset();
        }
        setConfirmOpen(nextOpen);
    };

    // Radix's AlertDialog sends the opening focus to an AlertDialogCancel, and this
    // dialog has none (cancel is a plain button of the form), so focus would stay behind it.
    const handleOpenAutoFocus = (event: Event) => {
        event.preventDefault();
        form.setFocus("currentPassword");
    };

    const focusPasswordAfterRefusal = () => {
        form.setFocus("currentPassword", { shouldSelect: true });
    };

    const onSubmit = (values: AccountDeletionFormValues) => {
        deleteAccountMutation.mutate(
            { currentPassword: values.currentPassword },
            { onError: focusPasswordAfterRefusal }
        );
    };

    return (
        <div className="flex w-full flex-1 flex-col gap-6">
            <SettingsSection
                description={privacyCopy.export.description}
                title={privacyCopy.export.title}
            >
                <Button
                    className="self-start"
                    disabled={isImpersonating || exportDataMutation.isPending}
                    loading={exportDataMutation.isPending}
                    onClick={() => exportDataMutation.mutate()}
                    type="button"
                    variant="outline"
                >
                    {privacyCopy.export.action}
                </Button>
                <p className="text-muted-foreground text-xs">
                    {privacyCopy.export.filenameHint}
                </p>
            </SettingsSection>

            <p className="text-muted-foreground text-sm">
                {privacyCopy.deadline}
                {policyHref ? (
                    <>
                        {" "}
                        <a
                            className="underline underline-offset-4"
                            href={policyHref}
                            rel="noreferrer"
                            target="_blank"
                        >
                            {privacyCopy.policyLink}
                        </a>
                    </>
                ) : null}
            </p>

            {askPrivacyChannel ? (
                <SettingsSection
                    description={deleteCopy.unsupportedDescription}
                    title={deleteCopy.unsupportedTitle}
                />
            ) : (
                <SettingsSection
                    description={deleteCopy.description}
                    title={deleteCopy.title}
                    tone="destructive"
                >
                    <AlertDialog
                        onOpenChange={handleOpenChange}
                        open={confirmOpen}
                    >
                        <AlertDialogTrigger asChild>
                            <Button
                                className="self-start"
                                disabled={isImpersonating}
                                type="button"
                                variant="destructive"
                            >
                                {deleteCopy.action}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent
                            onOpenAutoFocus={handleOpenAutoFocus}
                        >
                            <AlertDialogHeader>
                                <AlertDialogTitle>
                                    {deleteCopy.dialogTitle}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    {deleteCopy.dialogDescription}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <Form {...form}>
                                <form
                                    className="flex w-full flex-col"
                                    onSubmit={form.handleSubmit(onSubmit)}
                                >
                                    <FormContainer className="md:grid-cols-1">
                                        <HookFormInputPassword
                                            autoComplete="current-password"
                                            label={deleteCopy.currentPassword}
                                            name="currentPassword"
                                            required
                                        />
                                    </FormContainer>
                                    <AlertDialogFooter className="mt-4">
                                        <Button
                                            onClick={() =>
                                                handleOpenChange(false)
                                            }
                                            type="button"
                                            variant="outline"
                                        >
                                            {deleteCopy.cancel}
                                        </Button>
                                        <Button
                                            disabled={isImpersonating}
                                            loading={
                                                deleteAccountMutation.isPending
                                            }
                                            type="submit"
                                            variant="destructive"
                                        >
                                            {deleteCopy.confirm}
                                        </Button>
                                    </AlertDialogFooter>
                                </form>
                            </Form>
                        </AlertDialogContent>
                    </AlertDialog>
                </SettingsSection>
            )}
        </div>
    );
}
