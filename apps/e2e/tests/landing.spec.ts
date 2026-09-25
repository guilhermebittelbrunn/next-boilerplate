import { expect, test } from "@playwright/test";
import { expectAccessible } from "../support/a11y";
import { LOCALE, ptBr } from "../support/dictionary";
import { WEB_URL } from "../support/urls";

const webPagesCopy = ptBr.apps.web.pages;
const heroTitle = webPagesCopy.home.meta.title.split(" - ")[0];

test("the landing renders and its sign-up CTA opens the sign-up form", async ({
    page,
}, testInfo) => {
    const homePath = `/${LOCALE}`;
    const signUpPath = `/${LOCALE}/sign-up`;

    await page.goto(`${WEB_URL}${homePath}`, { waitUntil: "domcontentloaded" });
    const heroHeading = page.getByRole("heading", {
        level: 1,
        name: heroTitle,
    });
    await expect(heroHeading).toBeVisible();
    await expectAccessible(page, testInfo, { route: `web:${homePath}` });

    await page
        .locator("div")
        .filter({ has: heroHeading })
        .filter({
            has: page.getByRole("link", { name: webPagesCopy.cta.primaryCta }),
        })
        .last()
        .getByRole("link", { name: webPagesCopy.cta.secondaryCta })
        .click();

    await expect(page).toHaveURL(`${WEB_URL}${signUpPath}`);
    await expect(page.getByLabel(webPagesCopy.signUp.form.email)).toBeVisible();
    await expectAccessible(page, testInfo, { route: `web:${signUpPath}` });
});
