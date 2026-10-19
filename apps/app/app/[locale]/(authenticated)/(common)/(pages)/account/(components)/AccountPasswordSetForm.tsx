"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import useAuth from "@repo/auth/provider";
import { HookFormInputPassword } from "@repo/design-system/components/form/hookform";
import { Form } from "@repo/design-system/components/ui/form";
import { getDictionary } from "@repo/internationalization/client";
import { useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { Footer } from "@/shared/components/ui/Footer";
import { FormContainer } from "@/shared/components/ui/FormContainer";
import { useAuthRequestPanel } from "@/shared/providers/AuthRequestPanelContext";
import { useSignInMethodMutations } from "../(hooks)/useSignInMethodMutations";
import {
    type AccountPasswordSetFormValues,
    buildAccountPasswordSetSchema,
} from "../(validations)/accountFormSchema";

export function AccountPasswordSetForm() {
    const { dictionary } = getDictionary();
    const { isImpersonating } = useAuthRequestPanel();
    const { signOut } = useAuth();
    const setPasswordCopy =
        dictionary.apps.app.pages.common.account.security.setPassword;
    const { setPasswordMutation } = useSignInMethodMutations();

    const schema = useMemo(
        () => buildAccountPasswordSetSchema(dictionary),
        [dictionary]
    );

    const form = useForm<AccountPasswordSetFormValues>({
        resolver: zodResolver(schema),
        defaultValues: { password: "", confirmPassword: "" },
    });

    // A second submit before the re-render that disables the button would open a second
    // Google popup, so the in-flight state is tracked outside React's render cycle.
    const inFlightRef = useRef(false);

    // The form is validated before the Google popup opens, so a typo never costs a
    // re-authentication. Every session ends once the password is set.
    const onSubmit = (values: AccountPasswordSetFormValues) => {
        if (inFlightRef.current) {
            return;
        }
        inFlightRef.current = true;
        setPasswordMutation.mutate(values.password, {
            onSuccess: () => signOut.mutate(),
            onSettled: () => {
                inFlightRef.current = false;
            },
        });
    };

    return (
        <Form {...form}>
            <form
                className="flex w-full flex-col"
                onSubmit={form.handleSubmit(onSubmit)}
            >
                <h3 className="font-medium text-sm">{setPasswordCopy.title}</h3>
                <p className="mb-4 text-muted-foreground text-sm">
                    {setPasswordCopy.description}
                </p>
                <FormContainer>
                    <div className="col-span-1">
                        <HookFormInputPassword
                            label={setPasswordCopy.newPassword}
                            name="password"
                        />
                    </div>
                    <div className="col-span-1">
                        <HookFormInputPassword
                            label={setPasswordCopy.confirmPassword}
                            name="confirmPassword"
                        />
                    </div>
                </FormContainer>
                <Footer
                    confirmLabel={setPasswordCopy.save}
                    disabled={isImpersonating}
                    isLoading={setPasswordMutation.isPending}
                    showBack={false}
                />
            </form>
        </Form>
    );
}
