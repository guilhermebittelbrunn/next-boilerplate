"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { HookFormSelect } from "@repo/design-system/components/form/hookform";
import { Form } from "@repo/design-system/components/ui/form";
import { getDictionary } from "@repo/internationalization/client";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { Footer } from "@/shared/components/ui/Footer";
import { FormContainer } from "@/shared/components/ui/FormContainer";
import {
    buildOnboardingPreferencesSchema,
    type OnboardingLocale,
    type OnboardingPreferencesFormValues,
} from "../(validations)/onboardingFormSchema";

/** Endonyms: a language is always offered in its own language, never translated. */
const languageOptions = [
    { value: "pt-br", label: "Português" },
    { value: "en", label: "English" },
    { value: "es", label: "Español" },
];

type OnboardingPreferencesStepProps = {
    defaultLocale: OnboardingLocale;
    confirmLabel: string;
    isPending: boolean;
    onSubmit: (values: OnboardingPreferencesFormValues) => void;
    onSkip: () => void;
};

export function OnboardingPreferencesStep({
    defaultLocale,
    confirmLabel,
    isPending,
    onSubmit,
    onSkip,
}: OnboardingPreferencesStepProps) {
    const { dictionary } = getDictionary();
    const onboardingCopy = dictionary.apps.app.pages.onboarding;
    const onboardingPreferencesCopy = onboardingCopy.steps.preferences;

    const schema = useMemo(() => buildOnboardingPreferencesSchema(), []);

    const form = useForm<OnboardingPreferencesFormValues>({
        resolver: zodResolver(schema),
        defaultValues: { locale: defaultLocale },
    });

    return (
        <Form {...form}>
            <form
                className="flex w-full flex-col"
                onSubmit={form.handleSubmit(onSubmit)}
            >
                <FormContainer>
                    <div className="col-span-1 md:col-span-2">
                        <HookFormSelect
                            label={onboardingPreferencesCopy.language}
                            name="locale"
                            options={languageOptions}
                            placeholder={onboardingPreferencesCopy.language}
                            searchable={false}
                        />
                    </div>
                </FormContainer>
                <Footer
                    backLabel={onboardingCopy.actions.skip}
                    confirmLabel={confirmLabel}
                    isLoading={isPending}
                    onBack={onSkip}
                />
            </form>
        </Form>
    );
}
