"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
    HookFormInput,
    HookFormInputPassword,
} from "@repo/design-system/components/form/hookform";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@repo/design-system/components/ui/alert-dialog";
import { Form } from "@repo/design-system/components/ui/form";
import { getDictionary } from "@repo/internationalization/client";
import { type RefObject, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Footer } from "@/shared/components/ui/Footer";
import { FormContainer } from "@/shared/components/ui/FormContainer";
import { useAuthRequestPanel } from "@/shared/providers/AuthRequestPanelContext";
import { useAccountMutations } from "../(hooks)/useAccountMutations";
import {
    type AccountEmailChangeFormValues,
    buildAccountEmailChangeSchema,
} from "../(validations)/accountEmailChangeSchema";

type AccountEmailChangeDialogProps = {
    currentEmail: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    returnFocusRef: RefObject<HTMLButtonElement | null>;
};

const EMPTY_VALUES: AccountEmailChangeFormValues = {
    newEmail: "",
    currentPassword: "",
};

export function AccountEmailChangeDialog({
    currentEmail,
    open,
    onOpenChange,
    returnFocusRef,
}: AccountEmailChangeDialogProps) {
    const { dictionary } = getDictionary();
    const { isImpersonating } = useAuthRequestPanel();
    const emailChangeCopy =
        dictionary.apps.app.pages.common.account.profile.emailChange;
    const { requestEmailChangeMutation } = useAccountMutations();

    const schema = useMemo(
        () => buildAccountEmailChangeSchema(dictionary, currentEmail),
        [dictionary, currentEmail]
    );

    const form = useForm<AccountEmailChangeFormValues>({
        resolver: zodResolver(schema),
        defaultValues: EMPTY_VALUES,
    });

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            form.reset(EMPTY_VALUES);
        }
        onOpenChange(nextOpen);
    };

    // Radix's AlertDialog sends the opening focus to an AlertDialogCancel, and this
    // dialog has none (its buttons come from Footer), so focus would stay behind it.
    const handleOpenAutoFocus = (event: Event) => {
        event.preventDefault();
        form.setFocus("newEmail");
    };

    // The dialog is opened from a button outside it, not from an AlertDialogTrigger, so
    // Radix has no trigger to hand focus back to on close and would drop it on <body>.
    const handleCloseAutoFocus = (event: Event) => {
        event.preventDefault();
        returnFocusRef.current?.focus();
    };

    const onSubmit = (values: AccountEmailChangeFormValues) => {
        requestEmailChangeMutation.mutate(
            {
                newEmail: values.newEmail.trim(),
                currentPassword: values.currentPassword,
            },
            {
                onSuccess: () => handleOpenChange(false),
                onError: () =>
                    form.setFocus("currentPassword", { shouldSelect: true }),
            }
        );
    };

    return (
        <AlertDialog onOpenChange={handleOpenChange} open={open}>
            <AlertDialogContent
                onCloseAutoFocus={handleCloseAutoFocus}
                onOpenAutoFocus={handleOpenAutoFocus}
            >
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {emailChangeCopy.dialogTitle}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {emailChangeCopy.dialogDescription}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <Form {...form}>
                    <form
                        className="flex w-full flex-col"
                        onSubmit={form.handleSubmit(onSubmit)}
                    >
                        <FormContainer className="md:grid-cols-1">
                            <HookFormInput
                                autoComplete="email"
                                label={emailChangeCopy.newEmail}
                                name="newEmail"
                                placeholder={
                                    emailChangeCopy.newEmailPlaceholder
                                }
                                required
                                type="email"
                            />
                            <HookFormInputPassword
                                autoComplete="current-password"
                                label={emailChangeCopy.currentPassword}
                                name="currentPassword"
                                required
                            />
                        </FormContainer>
                        <Footer
                            backLabel={emailChangeCopy.cancel}
                            confirmLabel={emailChangeCopy.confirm}
                            disabled={isImpersonating}
                            isLoading={requestEmailChangeMutation.isPending}
                            onBack={() => handleOpenChange(false)}
                        />
                    </form>
                </Form>
            </AlertDialogContent>
        </AlertDialog>
    );
}
