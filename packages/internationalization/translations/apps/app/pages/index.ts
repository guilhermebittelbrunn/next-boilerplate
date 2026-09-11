import { adminTranslations } from "./admin";
import { commonTranslations } from "./common";
import { emailVerificationTranslations } from "./emailVerification";
import { forgotPasswordTranslations } from "./forgotPassword";
import { impersonationTranslations } from "./impersonation";
import { navbarTranslations } from "./navbar";
import { resetPasswordTranslations } from "./resetPassword";
import { signInTranslations } from "./signIn";
import { signUpTranslations } from "./signUp";

export const pagesTranslations = {
    "pt-br": {
        signIn: signInTranslations["pt-br"],
        signUp: signUpTranslations["pt-br"],
        forgotPassword: forgotPasswordTranslations["pt-br"],
        resetPassword: resetPasswordTranslations["pt-br"],
        emailVerification: emailVerificationTranslations["pt-br"],
        common: commonTranslations["pt-br"],
        admin: adminTranslations["pt-br"],
        navbar: navbarTranslations["pt-br"],
        impersonation: impersonationTranslations["pt-br"],
    },
    en: {
        signIn: signInTranslations.en,
        signUp: signUpTranslations.en,
        forgotPassword: forgotPasswordTranslations.en,
        resetPassword: resetPasswordTranslations.en,
        emailVerification: emailVerificationTranslations.en,
        common: commonTranslations.en,
        admin: adminTranslations.en,
        navbar: navbarTranslations.en,
        impersonation: impersonationTranslations.en,
    },
    es: {
        signIn: signInTranslations.es,
        signUp: signUpTranslations.es,
        forgotPassword: forgotPasswordTranslations.es,
        resetPassword: resetPasswordTranslations.es,
        emailVerification: emailVerificationTranslations.es,
        common: commonTranslations.es,
        admin: adminTranslations.es,
        navbar: navbarTranslations.es,
        impersonation: impersonationTranslations.es,
    },
};
