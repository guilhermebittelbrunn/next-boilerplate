import type { Page } from "@playwright/test";
import { LOCALE, ptBr } from "./dictionary";
import type { SeedAccount } from "./seedAccounts";

const signInCopy = ptBr.apps.app.pages.signIn;

export const signInPath = `/${LOCALE}/sign-in`;

// The password field is located by name: its label is bound to a wrapper, not to the
// input, so it has no accessible name to query by.
export const passwordInput = (page: Page, name = "password") =>
    page.locator(`input[name="${name}"]`);

export async function fillSignInForm(page: Page, account: SeedAccount) {
    await page.getByLabel(signInCopy.form.email).fill(account.email);
    await passwordInput(page).fill(account.password);
    await page
        .locator("form")
        .getByRole("button", { name: signInCopy.form.submit, exact: true })
        .click();
}

export async function signInThroughForm(page: Page, account: SeedAccount) {
    await page.goto(signInPath);
    await fillSignInForm(page, account);
}
