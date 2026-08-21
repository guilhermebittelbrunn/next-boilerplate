import { appsTranslations } from "./apps";
import { componentsTranslations } from "./components";
import { packagesTranslations } from "./packages";

export const globalTranslations = {
    "pt-br": {
        components: componentsTranslations["pt-br"],
        apps: appsTranslations["pt-br"],
        packages: packagesTranslations["pt-br"],
    },
    en: {
        components: componentsTranslations.en,
        apps: appsTranslations.en,
        packages: packagesTranslations.en,
    },
    es: {
        components: componentsTranslations.es,
        apps: appsTranslations.es,
        packages: packagesTranslations.es,
    },
};
