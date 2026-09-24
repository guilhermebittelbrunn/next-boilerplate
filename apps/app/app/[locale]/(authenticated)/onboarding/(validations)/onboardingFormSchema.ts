import type { globalTranslations } from "@repo/internationalization/translations/global";
import { z } from "zod";

type Dictionary = (typeof globalTranslations)[keyof typeof globalTranslations];

const DISPLAY_NAME_MAX = 120;

export const onboardingLocaleValues = ["pt-br", "en", "es"] as const;

export type OnboardingLocale = (typeof onboardingLocaleValues)[number];

export type OnboardingProfileFormValues = {
    displayName: string;
};

export type OnboardingPreferencesFormValues = {
    locale: OnboardingLocale;
};

export function buildOnboardingProfileSchema(dictionary: Dictionary) {
    const validation =
        dictionary.apps.app.pages.onboarding.steps.profile.validation;

    return z.object({
        displayName: z
            .string()
            .trim()
            .min(1, validation.displayNameRequired)
            .max(DISPLAY_NAME_MAX, validation.displayNameMax),
    });
}

export function buildOnboardingPreferencesSchema() {
    return z.object({
        locale: z.enum(onboardingLocaleValues),
    });
}
