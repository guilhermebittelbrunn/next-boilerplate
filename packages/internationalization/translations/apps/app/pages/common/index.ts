import { commonAccountPageTranslations } from "./account";
import { commonEntitiesPageTranslations } from "./entities";
import { commonHomePageTranslations } from "./home";
import { notFoundPageTranslations } from "./notFound";
import { commonRoutesTranslations } from "./routes";

export const commonTranslations = {
    "pt-br": {
        routes: commonRoutesTranslations["pt-br"],
        notFound: notFoundPageTranslations["pt-br"],
        home: commonHomePageTranslations["pt-br"],
        entities: commonEntitiesPageTranslations["pt-br"],
        account: commonAccountPageTranslations["pt-br"],
    },
    en: {
        routes: commonRoutesTranslations.en,
        notFound: notFoundPageTranslations.en,
        home: commonHomePageTranslations.en,
        entities: commonEntitiesPageTranslations.en,
        account: commonAccountPageTranslations.en,
    },
    es: {
        routes: commonRoutesTranslations.es,
        notFound: notFoundPageTranslations.es,
        home: commonHomePageTranslations.es,
        entities: commonEntitiesPageTranslations.es,
        account: commonAccountPageTranslations.es,
    },
};
