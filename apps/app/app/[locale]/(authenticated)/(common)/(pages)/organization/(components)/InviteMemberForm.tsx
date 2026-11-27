"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { HookFormInput } from "@repo/design-system/components/form/hookform";
import { Form } from "@repo/design-system/components/ui/form";
import { getDictionary } from "@repo/internationalization/client";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { Footer } from "@/shared/components/ui/Footer";
import { FormContainer } from "@/shared/components/ui/FormContainer";
import { SettingsSection } from "@/shared/components/ui/SettingsSection";
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
        <SettingsSection
            description={inviteCopy.description}
            headingLevel={2}
            title={inviteCopy.title}
        >
            <Form {...form}>
                <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
                    <FormContainer className="md:grid-cols-1">
                        <div className="w-full max-w-md">
                            <HookFormInput
                                autoComplete="off"
                                label={inviteCopy.emailLabel}
                                name="email"
                                placeholder={inviteCopy.emailPlaceholder}
                                required
                                spellCheck={false}
                                type="email"
                            />
                        </div>
                    </FormContainer>
                    <Footer
                        className="mt-5"
                        confirmLabel={inviteCopy.submit}
                        disabled={isImpersonating || inviteMutation.isPending}
                        isLoading={inviteMutation.isPending}
                        showBack={false}
                        sticky={false}
                    />
                </form>
            </Form>
        </SettingsSection>
    );
}
