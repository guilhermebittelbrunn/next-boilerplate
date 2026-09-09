import { authTranslations } from "./auth";
import { emailTranslations } from "./email";
import { sharedUtilsTranslations } from "./shared/utils";

export const packagesTranslations = {
    "pt-br": {
        auth: authTranslations["pt-br"],
        email: emailTranslations["pt-br"],
        utils: sharedUtilsTranslations["pt-br"],
    },
    en: {
        auth: authTranslations.en,
        email: emailTranslations.en,
        utils: sharedUtilsTranslations.en,
    },
    es: {
        auth: authTranslations.es,
        email: emailTranslations.es,
        utils: sharedUtilsTranslations.es,
    },
};
