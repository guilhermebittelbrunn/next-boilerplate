import { expect, test } from "@playwright/test";
import { expectAccessible } from "../support/a11y";
import { LOCALE, ptBr } from "../support/dictionary";
import { SEED_PASSWORD } from "../support/seedAccounts";
import { passwordInput } from "../support/signIn";
import { APP_URL } from "../support/urls";

const signUpCopy = ptBr.apps.app.pages.signUp;
const onboardingCopy = ptBr.apps.app.pages.onboarding;

const progressLabel = (current: number) =>
    onboardingCopy.progress
        .replace("{current}", String(current))
        .replace("{total}", "2");

test("a new account goes through onboarding and reaches the panel", async ({
    page,
}, testInfo) => {
    const signUpPath = `/${LOCALE}/sign-up`;
    const onboardingPath = `/${LOCALE}/onboarding`;

    await page.goto(signUpPath);
    await expectAccessible(page, testInfo, { route: signUpPath });

    await page
        .getByLabel(signUpCopy.form.email)
        .fill(`e2e-signup-${Date.now()}@example.com`);
    await passwordInput(page).fill(SEED_PASSWORD);
    await passwordInput(page, "confirmPassword").fill(SEED_PASSWORD);
    await page
        .locator("form")
        .getByRole("button", { name: signUpCopy.form.submit, exact: true })
        .click();

    await expect(page).toHaveURL(`${APP_URL}${onboardingPath}`);
    await expect(page.getByText(progressLabel(1))).toBeVisible();
    const displayName = page.getByLabel(
        onboardingCopy.steps.profile.displayName
    );
    await expect(displayName).toBeVisible();
    await expectAccessible(page, testInfo, {
        route: `${onboardingPath}#profile`,
    });

    await displayName.fill("E2E Sign Up");
    await page
        .getByRole("button", { name: onboardingCopy.actions.next })
        .click();

    await expect(page.getByText(progressLabel(2))).toBeVisible();
    await expectAccessible(page, testInfo, {
        route: `${onboardingPath}#preferences`,
    });
    await page
        .getByRole("button", { name: onboardingCopy.actions.skip })
        .click();

    await expect(page).toHaveURL(`${APP_URL}/${LOCALE}`);
    await expect(
        page.getByRole("link", {
            name: ptBr.apps.app.pages.common.routes.platform.entities.list,
        })
    ).toBeVisible();
    await expectAccessible(page, testInfo, { route: `/${LOCALE}` });
});
