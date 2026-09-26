import { globalTranslations } from "@repo/internationalization/translations/global";
import {
    EXISTING_PASSWORD_MIN_LENGTH,
    PASSWORD_MIN_LENGTH,
} from "@repo/shared/utils/helpers/passwordPolicy";
import { describe, expect, it } from "vitest";

const LOCALES = ["pt-br", "en", "es"] as const;

type Locale = (typeof LOCALES)[number];

/**
 * The number is written into the copy instead of interpolated, so nothing but this test
 * notices when the constant moves and a message keeps announcing the old minimum.
 */
function newPasswordMessages(locale: Locale): Record<string, string> {
    const { apps, packages } = globalTranslations[locale];
    return {
        "app signUp.passwordMin": apps.app.pages.signUp.validation.passwordMin,
        "app resetPassword.passwordMin":
            apps.app.pages.resetPassword.validation.passwordMin,
        "app admin.users.passwordMin":
            apps.app.pages.admin.users.form.validation.passwordMin,
        "app account.security.newPasswordMin":
            apps.app.pages.common.account.security.validation.newPasswordMin,
        "web signUp.passwordMin": apps.web.pages.signUp.validation.passwordMin,
        "apiErrors.AUTH_PASSWORD_TOO_SHORT":
            packages.utils.apiErrors.AUTH_PASSWORD_TOO_SHORT,
    };
}

function existingPasswordMessages(locale: Locale): Record<string, string> {
    const { apps } = globalTranslations[locale];
    return {
        "app signIn.passwordMin": apps.app.pages.signIn.validation.passwordMin,
        "app account.security.min":
            apps.app.pages.common.account.security.validation.min,
        "app account.privacy.delete.min":
            apps.app.pages.common.account.privacy.delete.validation.min,
    };
}

describe.each(LOCALES)("password length copy in %s", (locale) => {
    it.each(Object.entries(newPasswordMessages(locale)))(
        "%s announces the new-password minimum",
        (_key, message) => {
            expect(message).toContain(String(PASSWORD_MIN_LENGTH));
        }
    );

    it.each(Object.entries(existingPasswordMessages(locale)))(
        "%s announces the existing-password minimum",
        (_key, message) => {
            expect(message).toContain(String(EXISTING_PASSWORD_MIN_LENGTH));
            expect(message).not.toContain(String(PASSWORD_MIN_LENGTH));
        }
    );
});
