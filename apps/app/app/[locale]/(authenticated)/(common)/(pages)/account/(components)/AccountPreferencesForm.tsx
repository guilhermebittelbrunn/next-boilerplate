"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
    HookFormRadioGroup,
    HookFormSelect,
} from "@repo/design-system/components/form/hookform";
import { Form } from "@repo/design-system/components/ui/form";
import type { RadioOption } from "@repo/design-system/components/ui/radio-group-input";
import { getDictionary } from "@repo/internationalization/client";
import type { AccountDTO } from "@repo/sdk/src/types";
import { setCookie } from "@repo/shared/utils";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Footer } from "@/shared/components/ui/Footer";
import { FormContainer } from "@/shared/components/ui/FormContainer";
import { withLocalePath } from "@/shared/lib/localePath";
import {
    PREFERENCE_COOKIE_TTL_SECONDS,
    storeActiveTheme,
} from "@/shared/lib/themePreference";
import { useAuthRequestPanel } from "@/shared/providers/AuthRequestPanelContext";
import { useAccountMutations } from "../(hooks)/useAccountMutations";
import {
    type AccountPreferencesFormValues,
    accountThemeValues,
    buildAccountPreferencesSchema,
} from "../(validations)/accountFormSchema";

/** Endonyms: a language is always offered in its own language, never translated. */
const languageOptions = [
    { value: "pt-br", label: "Português" },
    { value: "en", label: "English" },
    { value: "es", label: "Español" },
];

type AccountPreferencesFormProps = {
    account: AccountDTO | undefined;
};

export function AccountPreferencesForm({
    account,
}: AccountPreferencesFormProps) {
    const { dictionary } = getDictionary();
    const router = useRouter();
    const { setTheme } = useTheme();
    const { isImpersonating } = useAuthRequestPanel();
    const accountPreferences =
        dictionary.apps.app.pages.common.account.preferences;
    const { updatePreferencesMutation } = useAccountMutations();

    const schema = useMemo(() => buildAccountPreferencesSchema(), []);

    const form = useForm<AccountPreferencesFormValues>({
        resolver: zodResolver(schema),
        defaultValues: { theme: "system", locale: "pt-br" },
    });

    useEffect(() => {
        if (account) {
            form.reset({
                theme: account.preferences.theme,
                locale: account.preferences.locale,
            });
        }
    }, [account, form]);

    const themeOptions = useMemo<RadioOption[]>(
        () =>
            accountThemeValues.map((value) => ({
                value,
                label: accountPreferences.themeOptions[value],
            })),
        [accountPreferences.themeOptions]
    );

    const onSubmit = (values: AccountPreferencesFormValues) => {
        updatePreferencesMutation.mutate(
            { preferences: values },
            {
                onSuccess: () => {
                    // Both cookies are read on the server for the first paint, so they
                    // are written before navigating, not after.
                    setTheme(values.theme);
                    storeActiveTheme(values.theme);
                    setCookie(
                        "x-locale",
                        values.locale,
                        PREFERENCE_COOKIE_TTL_SECONDS
                    );
                    router.push(
                        withLocalePath(
                            values.locale,
                            "/account?tab=preferences"
                        )
                    );
                    router.refresh();
                },
            }
        );
    };

    return (
        <Form {...form}>
            <form
                className="flex w-full flex-1 flex-col"
                onSubmit={form.handleSubmit(onSubmit)}
            >
                <p className="mb-4 text-muted-foreground text-sm">
                    {accountPreferences.description}
                </p>
                <FormContainer>
                    <div className="col-span-1 md:col-span-2">
                        <HookFormRadioGroup
                            label={accountPreferences.theme}
                            name="theme"
                            options={themeOptions}
                        />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                        <HookFormSelect
                            label={accountPreferences.language}
                            name="locale"
                            options={languageOptions}
                            placeholder={accountPreferences.language}
                            searchable={false}
                        />
                    </div>
                </FormContainer>
                <Footer
                    confirmLabel={accountPreferences.save}
                    disabled={isImpersonating}
                    isLoading={updatePreferencesMutation.isPending}
                    showBack={false}
                />
            </form>
        </Form>
    );
}
