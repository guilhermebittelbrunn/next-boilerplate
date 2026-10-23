import { commonAccountPageTranslations } from "./account";
import { commonEntitiesPageTranslations } from "./entities";
import { globalErrorPageTranslations } from "./globalError";
import { commonHomePageTranslations } from "./home";
import { notFoundPageTranslations } from "./notFound";
import { commonOrganizationPageTranslations } from "./organization";
import { commonRoutesTranslations } from "./routes";

export const commonTranslations = {
    "pt-br": {
        routes: commonRoutesTranslations["pt-br"],
        notFound: notFoundPageTranslations["pt-br"],
        globalError: globalErrorPageTranslations["pt-br"],
        home: commonHomePageTranslations["pt-br"],
        entities: commonEntitiesPageTranslations["pt-br"],
        account: commonAccountPageTranslations["pt-br"],
        organization: commonOrganizationPageTranslations["pt-br"],
    },
    en: {
        routes: commonRoutesTranslations.en,
        notFound: notFoundPageTranslations.en,
        globalError: globalErrorPageTranslations.en,
        home: commonHomePageTranslations.en,
        entities: commonEntitiesPageTranslations.en,
        account: commonAccountPageTranslations.en,
        organization: commonOrganizationPageTranslations.en,
    },
    es: {
        routes: commonRoutesTranslations.es,
        notFound: notFoundPageTranslations.es,
        globalError: globalErrorPageTranslations.es,
        home: commonHomePageTranslations.es,
        entities: commonEntitiesPageTranslations.es,
        account: commonAccountPageTranslations.es,
        organization: commonOrganizationPageTranslations.es,
    },
};
