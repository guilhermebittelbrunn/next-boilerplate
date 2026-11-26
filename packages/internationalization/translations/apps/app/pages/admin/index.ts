import { adminAccountPageTranslations } from "./account";
import { adminAuditTrailPageTranslations } from "./auditTrail";
import { adminHomePageTranslations } from "./home";
import { adminRoutesTranslations } from "./routes";
import { adminUsersPageTranslations } from "./users";

export const adminTranslations = {
    "pt-br": {
        account: adminAccountPageTranslations["pt-br"],
        routes: adminRoutesTranslations["pt-br"],
        home: adminHomePageTranslations["pt-br"],
        users: adminUsersPageTranslations["pt-br"],
        auditTrail: adminAuditTrailPageTranslations["pt-br"],
    },
    en: {
        account: adminAccountPageTranslations.en,
        routes: adminRoutesTranslations.en,
        home: adminHomePageTranslations.en,
        users: adminUsersPageTranslations.en,
        auditTrail: adminAuditTrailPageTranslations.en,
    },
    es: {
        account: adminAccountPageTranslations.es,
        routes: adminRoutesTranslations.es,
        home: adminHomePageTranslations.es,
        users: adminUsersPageTranslations.es,
        auditTrail: adminAuditTrailPageTranslations.es,
    },
};
