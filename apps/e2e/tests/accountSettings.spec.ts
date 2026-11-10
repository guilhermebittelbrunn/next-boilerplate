import { expect, type Page, test } from "@playwright/test";
import { LOCALE, ptBr } from "../support/dictionary";
import { AUTH_STATE } from "../support/paths";

test.use({ storageState: AUTH_STATE.common });

const accountCopy = ptBr.apps.app.pages.common.account;
const accountPath = `/${LOCALE}/account`;

const expectQueryParam = async (page: Page, key: string, value: string) => {
    await expect
        .poll(() => new URL(page.url()).searchParams.get(key))
        .toBe(value);
};

// The section is derived from the URL on every render. These checks need the real Next
// router: a tab click rewrites the URL through the History API, and a sidebar link is a
// client navigation, and both must reach useSearchParams without a reload.
test("the account section follows the URL, the sidebar and the tabs", async ({
    page,
}) => {
    await page.goto(`${accountPath}?tab=security`);
    await expect(
        page.getByRole("heading", { level: 1, name: accountCopy.title })
    ).toBeVisible();
    await expect(
        page.getByRole("heading", { level: 2, name: accountCopy.tabs.security })
    ).toBeVisible();

    const sidebarPrivacyLink = page.getByRole("link", {
        name: accountCopy.tabs.privacy,
        exact: true,
    });
    await sidebarPrivacyLink.click();
    await expectQueryParam(page, "tab", "privacy");
    await expect(
        page.getByRole("heading", { level: 2, name: accountCopy.tabs.privacy })
    ).toBeVisible();
    await expect(sidebarPrivacyLink).toHaveAttribute("aria-current", "page");

    await page
        .getByRole("tablist", { name: accountCopy.sectionNav.label })
        .getByRole("tab", { name: accountCopy.tabs.preferences })
        .click();
    await expectQueryParam(page, "tab", "preferences");
    await expect(
        page.getByRole("heading", {
            level: 2,
            name: accountCopy.tabs.preferences,
        })
    ).toBeVisible();
    await expect(
        page.getByRole("link", {
            name: accountCopy.tabs.preferences,
            exact: true,
        })
    ).toHaveAttribute("aria-current", "page");
});

test("a link without a section lands on the profile", async ({ page }) => {
    await page.goto(accountPath);

    await expectQueryParam(page, "tab", "profile");
    await expect(
        page.getByRole("heading", { level: 2, name: accountCopy.tabs.profile })
    ).toBeVisible();
});

test("the billing deep link keeps the checkout outcome in the URL", async ({
    page,
}) => {
    await page.goto(`${accountPath}?tab=billing&checkout=canceled`);

    await expect(
        page
            .getByRole("tablist", { name: accountCopy.sectionNav.label })
            .getByRole("tab", { name: accountCopy.tabs.billing })
    ).toHaveAttribute("aria-selected", "true");
    await expectQueryParam(page, "checkout", "canceled");
    await expectQueryParam(page, "tab", "billing");
});
