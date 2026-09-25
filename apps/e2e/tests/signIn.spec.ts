import { expect, test } from "@playwright/test";
import { expectAccessible } from "../support/a11y";
import { LOCALE, ptBr } from "../support/dictionary";
import { SEED_ACCOUNTS } from "../support/seedAccounts";
import {
    fillSignInForm,
    signInPath,
    signInThroughForm,
} from "../support/signIn";
import { APP_URL } from "../support/urls";

const firebaseErrors = ptBr.packages.auth.provider.firebase.error;
const commonRoutesCopy = ptBr.apps.app.pages.common.routes;

const escapeRegExp = (text: string) =>
    text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The Auth emulator answers a wrong password with INVALID_PASSWORD, while a project with
// email enumeration protection answers INVALID_LOGIN_CREDENTIALS; the SDK maps them to
// different codes, and either translated message is correct.
const wrongPasswordMessage = new RegExp(
    `${escapeRegExp(firebaseErrors["auth/wrong-password"])}|${escapeRegExp(firebaseErrors["auth/invalid-credential"])}`
);

test("a common user signs in and lands on the common panel", async ({
    page,
}, testInfo) => {
    await page.goto(signInPath);
    await expectAccessible(page, testInfo, { route: signInPath });

    await fillSignInForm(page, SEED_ACCOUNTS.common);

    await expect(page).toHaveURL(`${APP_URL}/${LOCALE}`);
    await expect(
        page.getByRole("link", {
            name: commonRoutesCopy.platform.entities.list,
        })
    ).toBeVisible();
});

test("an admin signs in and lands on the admin home", async ({ page }) => {
    await signInThroughForm(page, SEED_ACCOUNTS.admin);

    await expect(page).toHaveURL(`${APP_URL}/${LOCALE}/admin`);
    await expect(
        page.getByRole("heading", {
            level: 1,
            name: new RegExp(`^${ptBr.apps.app.pages.admin.home.greeting}`),
        })
    ).toBeVisible();
});

test("a wrong password keeps the user on sign-in with a translated message", async ({
    page,
}) => {
    await signInThroughForm(page, {
        email: SEED_ACCOUNTS.common.email,
        password: `${SEED_ACCOUNTS.common.password}-wrong`,
    });

    await expect(page.getByText(wrongPasswordMessage)).toBeVisible();
    await expect(page).toHaveURL(`${APP_URL}${signInPath}`);
});

test("a deep link without a session returns to its destination after sign-in", async ({
    page,
}) => {
    const destination = `/${LOCALE}/entities`;

    await page.goto(destination);
    await expect(page).toHaveURL(
        `${APP_URL}${signInPath}?redirect=${encodeURIComponent(destination)}`
    );

    await fillSignInForm(page, SEED_ACCOUNTS.common);

    await expect(page).toHaveURL(`${APP_URL}${destination}`);
});
