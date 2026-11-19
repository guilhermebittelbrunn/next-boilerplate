import { LOCALE } from "../support/dictionary";
import type { AUTH_STATE } from "../support/paths";
import { APP_URL, WEB_URL } from "../support/urls";

export type ShowcaseShot = {
    name: string;
    url: string;
    signedInAs?: keyof typeof AUTH_STATE;
    theme?: "light" | "dark";
    mobile?: boolean;
    fullPage?: boolean;
};

const web = (path = "") => `${WEB_URL}/${LOCALE}${path}`;
const app = (path = "") => `${APP_URL}/${LOCALE}${path}`;

export const SHOWCASE_SHOTS: ShowcaseShot[] = [
    { name: "web-home-light", url: web() },
    { name: "web-home-dark", url: web(), theme: "dark" },
    { name: "web-home-en", url: `${WEB_URL}/en` },
    { name: "web-home-es", url: `${WEB_URL}/es` },
    { name: "web-home-full", url: web(), fullPage: true },
    { name: "web-pricing", url: web("/pricing") },
    { name: "web-contact", url: web("/contact") },
    { name: "web-home-mobile", url: web(), mobile: true },
    { name: "app-sign-in", url: app("/sign-in") },
    { name: "app-sign-in-dark", url: app("/sign-in"), theme: "dark" },
    { name: "app-home", url: app(), signedInAs: "common" },
    { name: "app-home-dark", url: app(), signedInAs: "common", theme: "dark" },
    {
        name: "app-home-mobile",
        url: app(),
        signedInAs: "common",
        mobile: true,
    },
    { name: "app-entities", url: app("/entities"), signedInAs: "common" },
    {
        name: "app-entities-dark",
        url: app("/entities"),
        signedInAs: "common",
        theme: "dark",
    },
    {
        name: "app-entity-create",
        url: app("/entities/create"),
        signedInAs: "common",
    },
    { name: "app-account", url: app("/account"), signedInAs: "common" },
    {
        name: "app-account-security",
        url: app("/account?tab=security"),
        signedInAs: "common",
    },
    {
        name: "app-organization",
        url: app("/organization"),
        signedInAs: "common",
    },
    { name: "admin-home", url: app("/admin"), signedInAs: "admin" },
    {
        name: "admin-home-dark",
        url: app("/admin"),
        signedInAs: "admin",
        theme: "dark",
    },
    { name: "admin-users", url: app("/admin/users"), signedInAs: "admin" },
    { name: "admin-audit", url: app("/admin/audit"), signedInAs: "admin" },
];
