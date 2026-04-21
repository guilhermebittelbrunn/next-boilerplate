import { adminTranslations } from "./admin";
import { commonTranslations } from "./common";
import { navbarTranslations } from "./navbar";
import { signInTranslations } from "./signIn";
import { signUpTranslations } from "./signUp";

export const pagesTranslations = {
    "pt-br": {
        signIn: signInTranslations["pt-br"],
        signUp: signUpTranslations["pt-br"],
        common: commonTranslations["pt-br"],
        admin: adminTranslations["pt-br"],
        navbar: navbarTranslations["pt-br"],
    },
    en: {
        signIn: signInTranslations.en,
        signUp: signUpTranslations.en,
        common: commonTranslations.en,
        admin: adminTranslations.en,
        navbar: navbarTranslations.en,
    },
    es: {
        signIn: signInTranslations.es,
        signUp: signUpTranslations.es,
        common: commonTranslations.es,
        admin: adminTranslations.es,
        navbar: navbarTranslations.es,
    },
};
