"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { HookFormInput } from "@repo/design-system/components/form/hookform";
import { Form } from "@repo/design-system/components/ui/form";
import { getDictionary } from "@repo/internationalization/client";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { Footer } from "@/shared/components/ui/Footer";
import { FormContainer } from "@/shared/components/ui/FormContainer";
import { useAuthRequestPanel } from "@/shared/providers/AuthRequestPanelContext";
import { useOrganizationActions } from "../(hooks)/useOrganizationActions";
import {
    buildInviteMemberFormSchema,
    type InviteMemberFormValues,
} from "../(validations)/inviteMemberFormSchema";

export function InviteMemberForm() {
    const { dictionary } = getDictionary();
    const { isImpersonating } = useAuthRequestPanel();
    const { inviteMutation } = useOrganizationActions();
    const inviteCopy = dictionary.apps.app.pages.common.organization.invite;

    const schema = useMemo(
        () => buildInviteMemberFormSchema(dictionary),
        [dictionary]
    );

    const form = useForm<InviteMemberFormValues>({
        resolver: zodResolver(schema),
        defaultValues: { email: "" },
    });

    const onSubmit = (values: InviteMemberFormValues) => {
        inviteMutation.mutate(
            { email: values.email },
            { onSuccess: () => form.reset({ email: "" }) }
        );
    };

    return (
        <section className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
                <h2 className="font-semibold text-lg">{inviteCopy.title}</h2>
                <p className="text-muted-foreground text-sm">
                    {inviteCopy.description}
                </p>
            </div>
            <Form {...form}>
                <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
                    <FormContainer>
                        <HookFormInput
                            autoComplete="off"
                            label={inviteCopy.emailLabel}
                            name="email"
                            placeholder={inviteCopy.emailPlaceholder}
                            required
                            type="email"
                        />
                    </FormContainer>
                    <Footer
                        className="static border-t-0 bg-transparent backdrop-blur-none supports-backdrop-filter:bg-transparent"
                        confirmLabel={inviteCopy.submit}
                        disabled={isImpersonating || inviteMutation.isPending}
                        isLoading={inviteMutation.isPending}
                        showBack={false}
                    />
                </form>
            </Form>
        </section>
    );
}
