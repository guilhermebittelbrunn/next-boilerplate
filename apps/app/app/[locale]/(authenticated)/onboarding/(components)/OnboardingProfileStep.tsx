"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { HookFormInput } from "@repo/design-system/components/form/hookform";
import { Form } from "@repo/design-system/components/ui/form";
import { getDictionary } from "@repo/internationalization/client";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { Footer } from "@/shared/components/ui/Footer";
import { FormContainer } from "@/shared/components/ui/FormContainer";
import {
    buildOnboardingProfileSchema,
    type OnboardingProfileFormValues,
} from "../(validations)/onboardingFormSchema";

type OnboardingProfileStepProps = {
    defaultDisplayName: string;
    confirmLabel: string;
    isPending: boolean;
    onSubmit: (values: OnboardingProfileFormValues) => void;
};

export function OnboardingProfileStep({
    defaultDisplayName,
    confirmLabel,
    isPending,
    onSubmit,
}: OnboardingProfileStepProps) {
    const { dictionary } = getDictionary();
    const onboardingProfileCopy =
        dictionary.apps.app.pages.onboarding.steps.profile;

    const schema = useMemo(
        () => buildOnboardingProfileSchema(dictionary),
        [dictionary]
    );

    const form = useForm<OnboardingProfileFormValues>({
        resolver: zodResolver(schema),
        defaultValues: { displayName: defaultDisplayName },
    });

    return (
        <Form {...form}>
            <form
                className="flex w-full flex-col"
                noValidate
                onSubmit={form.handleSubmit((values) =>
                    onSubmit({ displayName: values.displayName.trim() })
                )}
            >
                <FormContainer>
                    <div className="col-span-1 md:col-span-2">
                        <HookFormInput
                            autoComplete="name"
                            label={onboardingProfileCopy.displayName}
                            name="displayName"
                            placeholder={
                                onboardingProfileCopy.displayNamePlaceholder
                            }
                            required
                            type="text"
                        />
                    </div>
                </FormContainer>
                <Footer
                    confirmLabel={confirmLabel}
                    isLoading={isPending}
                    showBack={false}
                />
            </form>
        </Form>
    );
}
