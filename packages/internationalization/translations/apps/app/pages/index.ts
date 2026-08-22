import { adminTranslations } from "./admin";
import { commonTranslations } from "./common";
import { impersonationTranslations } from "./impersonation";
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
        impersonation: impersonationTranslations["pt-br"],
    },
    en: {
        signIn: signInTranslations.en,
        signUp: signUpTranslations.en,
        common: commonTranslations.en,
        admin: adminTranslations.en,
        navbar: navbarTranslations.en,
        impersonation: impersonationTranslations.en,
    },
    es: {
        signIn: signInTranslations.es,
        signUp: signUpTranslations.es,
        common: commonTranslations.es,
        admin: adminTranslations.es,
        navbar: navbarTranslations.es,
        impersonation: impersonationTranslations.es,
    },
};
