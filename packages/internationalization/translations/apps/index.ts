import { appTranslations } from "./app";
import { webTranslations } from "./web";

export const appsTranslations = {
    "pt-br": {
        web: webTranslations["pt-br"],
        app: appTranslations["pt-br"],
    },
    en: {
        web: webTranslations.en,
        app: appTranslations.en,
    },
    es: {
        web: webTranslations.es,
        app: appTranslations.es,
    },
};
