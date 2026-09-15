"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import useAuth from "@repo/auth/provider";
import { HookFormInputPassword } from "@repo/design-system/components/form/hookform";
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
import { Form } from "@repo/design-system/components/ui/form";
import { getDictionary } from "@repo/internationalization/client";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { Footer } from "@/shared/components/ui/Footer";
import { FormContainer } from "@/shared/components/ui/FormContainer";
import { useAuthRequestPanel } from "@/shared/providers/AuthRequestPanelContext";
import { useAccountMutations } from "../(hooks)/useAccountMutations";
import {
    type AccountPasswordFormValues,
    buildAccountPasswordSchema,
} from "../(validations)/accountFormSchema";

export function AccountSecurityForm() {
    const { dictionary } = getDictionary();
    const { isImpersonating } = useAuthRequestPanel();
    const { signOut } = useAuth();
    const accountSecurity = dictionary.apps.app.pages.common.account.security;
    const { changePasswordMutation, revokeSessionsMutation } =
        useAccountMutations();

    const schema = useMemo(
        () => buildAccountPasswordSchema(dictionary),
        [dictionary]
    );

    const form = useForm<AccountPasswordFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            currentPassword: "",
            password: "",
            confirmPassword: "",
        },
    });

    // Firebase cannot revoke sessions selectively, so both actions below end the current
    // one too: staying on a dead session would only fail the next request.
    const onSubmit = (values: AccountPasswordFormValues) => {
        changePasswordMutation.mutate(
            {
                currentPassword: values.currentPassword,
                password: values.password,
            },
            { onSuccess: () => signOut.mutate() }
        );
    };

    return (
        <div className="flex w-full flex-1 flex-col gap-6">
            <Form {...form}>
                <form
                    className="flex w-full flex-col"
                    onSubmit={form.handleSubmit(onSubmit)}
                >
                    <p className="mb-4 text-muted-foreground text-sm">
                        {accountSecurity.description}
                    </p>
                    <FormContainer>
                        <div className="col-span-1 md:col-span-2">
                            <HookFormInputPassword
                                label={accountSecurity.currentPassword}
                                name="currentPassword"
                            />
                        </div>
                        <div className="col-span-1">
                            <HookFormInputPassword
                                label={accountSecurity.newPassword}
                                name="password"
                            />
                        </div>
                        <div className="col-span-1">
                            <HookFormInputPassword
                                label={accountSecurity.confirmPassword}
                                name="confirmPassword"
                            />
                        </div>
                    </FormContainer>
                    <Footer
                        confirmLabel={accountSecurity.save}
                        disabled={isImpersonating}
                        isLoading={changePasswordMutation.isPending}
                        showBack={false}
                    />
                </form>
            </Form>

            <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
                <span className="font-medium text-sm">
                    {accountSecurity.signOutEverywhere}
                </span>
                <p className="text-muted-foreground text-sm">
                    {accountSecurity.signOutEverywhereDescription}
                </p>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            className="self-start"
                            disabled={isImpersonating}
                            type="button"
                            variant="outline"
                        >
                            {accountSecurity.signOutEverywhere}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                {accountSecurity.signOutEverywhere}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                {accountSecurity.signOutEverywhereConfirm}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>
                                {accountSecurity.cancel}
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() =>
                                    revokeSessionsMutation.mutate(undefined, {
                                        onSuccess: () => signOut.mutate(),
                                    })
                                }
                            >
                                {accountSecurity.signOutEverywhereAction}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}
