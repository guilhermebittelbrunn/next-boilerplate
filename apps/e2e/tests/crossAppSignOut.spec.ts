import { expect, type Page, test } from "@playwright/test";
import { LOCALE, ptBr } from "../support/dictionary";
import { SEED_ACCOUNTS } from "../support/seedAccounts";
import { signInThroughForm } from "../support/signIn";
import { APP_URL, WEB_URL } from "../support/urls";

const headerCopy = ptBr.components.header;
const profileCopy = ptBr.apps.app.shared.profileDropdown;
const sessionEndedNotice = ptBr.packages.auth.provider.session.revoked;

const homePath = `/${LOCALE}`;
const appSignIn = new RegExp(`^${APP_URL}/${LOCALE}/sign-in`);
const webSignIn = new RegExp(`^${WEB_URL}/${LOCALE}/sign-in`);

const sessionDeleted = (page: Page, origin: string) =>
    page.waitForResponse(
        (response) =>
            response.request().method() === "DELETE" &&
            response.url() === `${origin}/api/auth/session`
    );

async function signInOnAppAndOpenLanding(page: Page) {
    await signInThroughForm(page, SEED_ACCOUNTS.common);
    await expect(page).toHaveURL(`${APP_URL}${homePath}`);
    await page.goto(`${WEB_URL}${homePath}`);
    await expect(
        page.getByRole("button", { name: headerCopy.signOut })
    ).toBeVisible();
}

test("signing out on the landing ends the session in the app", async ({
    browser,
}) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
        await signInOnAppAndOpenLanding(page);

        const deleted = sessionDeleted(page, WEB_URL);
        await page.getByRole("button", { name: headerCopy.signOut }).click();
        expect((await deleted).ok()).toBe(true);
        await expect(
            page
                .getByRole("banner")
                .getByRole("link", { name: headerCopy.signIn, exact: true })
        ).toBeVisible();

        await page.goto(`${APP_URL}${homePath}`);
        await expect(page.getByText(sessionEndedNotice)).toBeVisible();
        await expect(page).toHaveURL(appSignIn);

        await page.goto(`${APP_URL}${homePath}`);
        await expect(page).toHaveURL(appSignIn);
    } finally {
        await context.close();
    }
});

test("signing out in the app ends the session on the landing", async ({
    browser,
}) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
        await signInOnAppAndOpenLanding(page);

        await page.goto(`${APP_URL}${homePath}`);
        const signOutItem = page.getByRole("menuitem", {
            name: profileCopy.signOut,
        });
        // A click that lands before the dropdown hydrates is lost.
        await expect(async () => {
            await page
                .getByRole("button", { name: profileCopy.triggerLabel })
                .click();
            await expect(signOutItem).toBeVisible({ timeout: 2000 });
        }).toPass();
        const deleted = sessionDeleted(page, APP_URL);
        await signOutItem.click();
        expect((await deleted).ok()).toBe(true);

        await page.goto(`${WEB_URL}${homePath}`);
        await expect(page.getByText(sessionEndedNotice)).toBeVisible();
        await expect(page).toHaveURL(webSignIn);

        await page.goto(`${APP_URL}${homePath}`);
        await expect(page).toHaveURL(appSignIn);
    } finally {
        await context.close();
    }
});
