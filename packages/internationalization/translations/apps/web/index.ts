import { layoutTranslations } from "./layout";
import { openGraphTranslations } from "./openGraph";
import { pagesTranslations } from "./pages";

export const webTranslations = {
    "pt-br": {
        pages: pagesTranslations["pt-br"],
        openGraph: openGraphTranslations["pt-br"],
        layout: layoutTranslations["pt-br"],
    },
    en: {
        pages: pagesTranslations.en,
        openGraph: openGraphTranslations.en,
        layout: layoutTranslations.en,
    },
    es: {
        pages: pagesTranslations.es,
        openGraph: openGraphTranslations.es,
        layout: layoutTranslations.es,
    },
};
