import { expect, type Locator, type Page, test } from "@playwright/test";
import { expectAccessible } from "../support/a11y";
import { LOCALE, ptBr } from "../support/dictionary";
import { AUTH_STATE } from "../support/paths";
import { SEEDED_ENTITY_NAME } from "../support/seedAccounts";
import { WEB_URL } from "../support/urls";

type DarkRoute = {
    route: string;
    url: string;
    ready: (page: Page) => Locator;
};

const appCopy = ptBr.apps.app.pages;
const webCopy = ptBr.apps.web.pages;

const checkInDark = (routes: DarkRoute[]) => {
    for (const { route, url, ready } of routes) {
        test(`${route} has no serious violation in dark mode`, async ({
            page,
        }, testInfo) => {
            await page.goto(url, { waitUntil: "domcontentloaded" });
            await expect(ready(page)).toBeVisible();
            await expectAccessible(page, testInfo, { route });
        });
    }
};

test.use({ colorScheme: "dark" });

test.describe("signed out", () => {
    checkInDark([
        {
            route: `web:/${LOCALE}`,
            url: `${WEB_URL}/${LOCALE}`,
            ready: (page) => page.getByRole("heading", { level: 1 }),
        },
        {
            route: `web:/${LOCALE}/sign-up`,
            url: `${WEB_URL}/${LOCALE}/sign-up`,
            ready: (page) => page.getByLabel(webCopy.signUp.form.email),
        },
        {
            route: `/${LOCALE}/sign-in`,
            url: `/${LOCALE}/sign-in`,
            ready: (page) => page.getByLabel(appCopy.signIn.form.email),
        },
        {
            route: `/${LOCALE}/sign-up`,
            url: `/${LOCALE}/sign-up`,
            ready: (page) => page.getByLabel(appCopy.signUp.form.email),
        },
    ]);
});

test.describe("as a common user", () => {
    test.use({ storageState: AUTH_STATE.common });

    checkInDark([
        {
            route: `/${LOCALE}`,
            url: `/${LOCALE}`,
            ready: (page) =>
                page.getByRole("link", {
                    name: appCopy.common.routes.platform.entities.list,
                }),
        },
        {
            route: `/${LOCALE}/entities`,
            url: `/${LOCALE}/entities`,
            ready: (page) =>
                page.getByRole("row").filter({ hasText: SEEDED_ENTITY_NAME }),
        },
        {
            route: `/${LOCALE}/entities/create`,
            url: `/${LOCALE}/entities/create`,
            ready: (page) => page.getByLabel(appCopy.common.entities.form.name),
        },
    ]);
});

test.describe("as an admin", () => {
    test.use({ storageState: AUTH_STATE.admin });

    checkInDark([
        {
            route: `/${LOCALE}/admin`,
            url: `/${LOCALE}/admin`,
            ready: (page) => page.getByRole("heading", { level: 1 }),
        },
        {
            route: `/${LOCALE}/admin/users`,
            url: `/${LOCALE}/admin/users`,
            ready: (page) => page.getByRole("table"),
        },
    ]);
});
