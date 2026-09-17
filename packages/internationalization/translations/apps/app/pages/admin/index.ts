import { adminAuditTrailPageTranslations } from "./auditTrail";
import { adminRoutesTranslations } from "./routes";
import { adminUsersPageTranslations } from "./users";

export const adminTranslations = {
    "pt-br": {
        routes: adminRoutesTranslations["pt-br"],
        users: adminUsersPageTranslations["pt-br"],
        auditTrail: adminAuditTrailPageTranslations["pt-br"],
    },
    en: {
        routes: adminRoutesTranslations.en,
        users: adminUsersPageTranslations.en,
        auditTrail: adminAuditTrailPageTranslations.en,
    },
    es: {
        routes: adminRoutesTranslations.es,
        users: adminUsersPageTranslations.es,
        auditTrail: adminAuditTrailPageTranslations.es,
    },
};
