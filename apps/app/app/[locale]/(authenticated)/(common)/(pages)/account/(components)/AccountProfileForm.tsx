"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
    HookFormImageUpload,
    HookFormInput,
} from "@repo/design-system/components/form/hookform";
import { Button } from "@repo/design-system/components/ui/button";
import { Form } from "@repo/design-system/components/ui/form";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { getDictionary } from "@repo/internationalization/client";
import type { AccountDTO } from "@repo/sdk/src/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Footer } from "@/shared/components/ui/Footer";
import { FormContainer } from "@/shared/components/ui/FormContainer";
import { useFileUpload } from "@/shared/hooks/useFileUpload";
import { isStorageEnabled } from "@/shared/lib/storageEnabled";
import { useAuthRequestPanel } from "@/shared/providers/AuthRequestPanelContext";
import { useAccountMutations } from "../(hooks)/useAccountMutations";
import {
    type AccountProfileFormValues,
    buildAccountProfileSchema,
} from "../(validations)/accountFormSchema";
import {
    AccountEmailChangeDialog,
    lacksPasswordProvider,
} from "./AccountEmailChangeDialog";

type AccountProfileFormProps = {
    account: AccountDTO | undefined;
};

export function AccountProfileForm({ account }: AccountProfileFormProps) {
    const { dictionary } = getDictionary();
    const { isImpersonating } = useAuthRequestPanel();
    const accountProfile = dictionary.apps.app.pages.common.account.profile;
    const { updateProfileMutation } = useAccountMutations();
    const { uploadFile, isUploading } = useFileUpload();
    const canUploadAvatar = isStorageEnabled();
    const [emailChangeOpen, setEmailChangeOpen] = useState(false);
    const emailChangeTriggerRef = useRef<HTMLButtonElement>(null);
    const canChangeEmail = !lacksPasswordProvider(account);

    const schema = useMemo(
        () => buildAccountProfileSchema(dictionary),
        [dictionary]
    );

    const form = useForm<AccountProfileFormValues>({
        resolver: zodResolver(schema),
        defaultValues: { displayName: "", phone: "", avatar: "" },
    });

    useEffect(() => {
        if (account) {
            form.reset({
                displayName: account.displayName ?? "",
                phone: account.phone ?? "",
                avatar: account.avatar ?? "",
            });
        }
    }, [account, form]);

    const onSubmit = (values: AccountProfileFormValues) => {
        updateProfileMutation.mutate({
            displayName: values.displayName.trim(),
            phone: values.phone.trim() || null,
            avatar: values.avatar.trim() || null,
        });
    };

    // The dialog has its own <form> and React bubbles `submit` through portals, so it
    // stays outside the profile form or confirming it would also save the profile.
    return (
        <>
            <Form {...form}>
                <form
                    className="flex w-full flex-1 flex-col"
                    onSubmit={form.handleSubmit(onSubmit)}
                >
                    <FormContainer>
                        <div className="col-span-1 md:col-span-2">
                            <HookFormInput
                                label={accountProfile.displayName}
                                name="displayName"
                                placeholder={
                                    accountProfile.displayNamePlaceholder
                                }
                                required
                                type="text"
                            />
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <HookFormInput
                                label={accountProfile.phone}
                                name="phone"
                                placeholder={accountProfile.phonePlaceholder}
                                type="tel"
                            />
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <Label htmlFor="account-email">
                                {accountProfile.email}
                            </Label>
                            <Input
                                disabled
                                id="account-email"
                                readOnly
                                value={account?.email ?? ""}
                            />
                            {canChangeEmail ? (
                                <Button
                                    className="mt-2"
                                    disabled={isImpersonating || !account}
                                    onClick={() => setEmailChangeOpen(true)}
                                    ref={emailChangeTriggerRef}
                                    type="button"
                                    variant="outline"
                                >
                                    {accountProfile.emailChange.action}
                                </Button>
                            ) : (
                                <p className="mt-1 text-muted-foreground text-xs">
                                    {accountProfile.emailChange.unsupported}
                                </p>
                            )}
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            {canUploadAvatar ? (
                                <HookFormImageUpload
                                    label={accountProfile.avatarUpload.label}
                                    name="avatar"
                                    previewSrc={account?.avatarUrl}
                                    texts={accountProfile.avatarUpload}
                                    upload={uploadFile}
                                />
                            ) : (
                                <>
                                    <HookFormInput
                                        label={accountProfile.avatar}
                                        name="avatar"
                                        placeholder={
                                            accountProfile.avatarPlaceholder
                                        }
                                        type="url"
                                    />
                                    <p className="mt-1 text-muted-foreground text-xs">
                                        {accountProfile.avatarHint}
                                    </p>
                                </>
                            )}
                        </div>
                    </FormContainer>
                    <Footer
                        confirmLabel={accountProfile.save}
                        disabled={isImpersonating || isUploading}
                        isLoading={updateProfileMutation.isPending}
                        showBack={false}
                    />
                </form>
            </Form>
            <AccountEmailChangeDialog
                currentEmail={account?.email ?? null}
                onOpenChange={setEmailChangeOpen}
                open={emailChangeOpen}
                returnFocusRef={emailChangeTriggerRef}
            />
        </>
    );
}
