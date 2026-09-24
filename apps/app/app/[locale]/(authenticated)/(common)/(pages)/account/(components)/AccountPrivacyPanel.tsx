"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { HookFormInputPassword } from "@repo/design-system/components/form/hookform";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
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
import { Footer } from "@/shared/components/ui/Footer";
import { FormContainer } from "@/shared/components/ui/FormContainer";
import { privacyPolicyUrl } from "@/shared/lib/privacyPolicyUrl";
import { useAuthRequestPanel } from "@/shared/providers/AuthRequestPanelContext";
import { useAccountDataRights } from "../(hooks)/useAccountDataRights";
import {
    type AccountDeletionFormValues,
    buildAccountDeletionSchema,
} from "../(validations)/accountDeletionSchema";

const PASSWORD_PROVIDER_ID = "password";

type AccountPrivacyPanelProps = {
    account: AccountDTO | undefined;
};

/**
 * Without a password provider there is no credential to re-enter, and the API refuses the
 * deletion for that reason. An account still loading is treated as able to confirm, so a
 * missing answer never shows the wrong block.
 */
function requiresPrivacyChannel(account: AccountDTO | undefined): boolean {
    const providers = account?.providerData;
    if (!providers) {
        return false;
    }
    return !providers.some(
        (provider) => provider.providerId === PASSWORD_PROVIDER_ID
    );
}

export function AccountPrivacyPanel({ account }: AccountPrivacyPanelProps) {
    const { dictionary, locale } = getDictionary();
    const { isImpersonating } = useAuthRequestPanel();
    const privacyCopy = dictionary.apps.app.pages.common.account.privacy;
    const deleteCopy = privacyCopy.delete;
    const { exportDataMutation, deleteAccountMutation } =
        useAccountDataRights();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const policyHref = privacyPolicyUrl(locale);
    const askPrivacyChannel = requiresPrivacyChannel(account);

    const schema = useMemo(
        () => buildAccountDeletionSchema(dictionary),
        [dictionary]
    );

    const form = useForm<AccountDeletionFormValues>({
        resolver: zodResolver(schema),
        defaultValues: { currentPassword: "" },
    });

    const onSubmit = (values: AccountDeletionFormValues) => {
        deleteAccountMutation.mutate({
            currentPassword: values.currentPassword,
        });
    };

    return (
        <div className="flex w-full flex-1 flex-col gap-6">
            <p className="text-muted-foreground text-sm">
                {privacyCopy.description}
            </p>

            <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
                <span className="font-medium text-sm">
                    {privacyCopy.export.title}
                </span>
                <p className="text-muted-foreground text-sm">
                    {privacyCopy.export.description}
                </p>
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
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
                {askPrivacyChannel ? (
                    <>
                        <span className="font-medium text-sm">
                            {deleteCopy.unsupportedTitle}
                        </span>
                        <p className="text-muted-foreground text-sm">
                            {deleteCopy.unsupportedDescription}
                        </p>
                    </>
                ) : (
                    <>
                        <span className="font-medium text-sm">
                            {deleteCopy.title}
                        </span>
                        <p className="text-muted-foreground text-sm">
                            {deleteCopy.description}
                        </p>
                        <AlertDialog
                            onOpenChange={setConfirmOpen}
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
                            <AlertDialogContent>
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
                                                label={
                                                    deleteCopy.currentPassword
                                                }
                                                name="currentPassword"
                                            />
                                        </FormContainer>
                                        <Footer
                                            backLabel={deleteCopy.cancel}
                                            confirmLabel={deleteCopy.confirm}
                                            disabled={isImpersonating}
                                            isLoading={
                                                deleteAccountMutation.isPending
                                            }
                                            onBack={() => setConfirmOpen(false)}
                                        />
                                    </form>
                                </Form>
                            </AlertDialogContent>
                        </AlertDialog>
                    </>
                )}
            </div>

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
        </div>
    );
}
