import { adminAuditTrailPageTranslations } from "./auditTrail";
import { adminHomePageTranslations } from "./home";
import { adminRoutesTranslations } from "./routes";
import { adminUsersPageTranslations } from "./users";

export const adminTranslations = {
    "pt-br": {
        routes: adminRoutesTranslations["pt-br"],
        home: adminHomePageTranslations["pt-br"],
        users: adminUsersPageTranslations["pt-br"],
        auditTrail: adminAuditTrailPageTranslations["pt-br"],
    },
    en: {
        routes: adminRoutesTranslations.en,
        home: adminHomePageTranslations.en,
        users: adminUsersPageTranslations.en,
        auditTrail: adminAuditTrailPageTranslations.en,
    },
    es: {
        routes: adminRoutesTranslations.es,
        home: adminHomePageTranslations.es,
        users: adminUsersPageTranslations.es,
        auditTrail: adminAuditTrailPageTranslations.es,
    },
};
