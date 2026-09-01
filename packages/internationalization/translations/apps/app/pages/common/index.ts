import { commonEntitiesPageTranslations } from "./entities";
import { notFoundPageTranslations } from "./notFound";
import { commonRoutesTranslations } from "./routes";

export const commonTranslations = {
    "pt-br": {
        routes: commonRoutesTranslations["pt-br"],
        notFound: notFoundPageTranslations["pt-br"],
        entities: commonEntitiesPageTranslations["pt-br"],
    },
    en: {
        routes: commonRoutesTranslations.en,
        notFound: notFoundPageTranslations.en,
        entities: commonEntitiesPageTranslations.en,
    },
    es: {
        routes: commonRoutesTranslations.es,
        notFound: notFoundPageTranslations.es,
        entities: commonEntitiesPageTranslations.es,
    },
};
