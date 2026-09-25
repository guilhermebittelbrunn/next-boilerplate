import { expect, test } from "@playwright/test";
import { expectAccessible } from "../support/a11y";
import { LOCALE, ptBr } from "../support/dictionary";
import { AUTH_STATE } from "../support/paths";
import { APP_URL } from "../support/urls";

const navbarCopy = ptBr.apps.app.pages.navbar;
const adminPath = `/${LOCALE}/admin`;
const commonPath = `/${LOCALE}`;
const entitiesPath = `/${LOCALE}/entities`;

test.describe("as an admin", () => {
    test.use({ storageState: AUTH_STATE.admin });

    test("switches to the user panel and back", async ({ page }, testInfo) => {
        await page.goto(adminPath);
        await expect(
            page.getByRole("heading", {
                level: 1,
                name: new RegExp(`^${ptBr.apps.app.pages.admin.home.greeting}`),
            })
        ).toBeVisible();
        await expectAccessible(page, testInfo, { route: adminPath });

        // The environment picker is a combobox without an accessible name; its current
        // value is the only stable handle.
        await page
            .getByRole("combobox")
            .filter({ hasText: navbarCopy.environmentAdmin })
            .click();
        await page
            .getByRole("option", { name: navbarCopy.environmentCommon })
            .click();

        await expect(page).toHaveURL(`${APP_URL}${commonPath}`);
        await expect(
            page
                .getByRole("combobox")
                .filter({ hasText: navbarCopy.environmentCommon })
        ).toBeVisible();

        // The read-only notice lives on the screens that write data, not on the home.
        await page
            .getByRole("link", {
                name: ptBr.apps.app.pages.common.routes.platform.entities.list,
            })
            .click();
        await expect(page).toHaveURL(`${APP_URL}${entitiesPath}`);
        await expect(
            page.getByText(ptBr.apps.app.pages.impersonation.readOnly.title)
        ).toBeVisible();
        await expect(
            page.getByRole("button", { name: ptBr.components.button.add })
        ).toBeDisabled();
        await expectAccessible(page, testInfo, {
            route: `${entitiesPath}#impersonating`,
        });

        await page
            .getByRole("combobox")
            .filter({ hasText: navbarCopy.environmentCommon })
            .click();
        await page
            .getByRole("option", { name: navbarCopy.environmentAdmin })
            .click();

        await expect(page).toHaveURL(`${APP_URL}${adminPath}`);
    });
});

test.describe("as a common user", () => {
    test.use({ storageState: AUTH_STATE.common });

    test("is sent back to the common panel from /admin", async ({ page }) => {
        await page.goto(adminPath);

        await expect(page).toHaveURL(`${APP_URL}${commonPath}`);
    });
});
