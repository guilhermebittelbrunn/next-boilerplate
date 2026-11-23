import { expect, test } from "@playwright/test";
import { expectAccessible } from "../support/a11y";
import { LOCALE, ptBr } from "../support/dictionary";
import { WEB_URL } from "../support/urls";

const webPagesCopy = ptBr.apps.web.pages;
const heroTitle = webPagesCopy.home.meta.title.split(" - ")[0];
const NOT_FOUND = 404;
const notFoundTitle = new RegExp(`^${webPagesCopy.notFound.title} \\| `);

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

test("an unknown landing path answers 404 with the translated page and a link home", async ({
    page,
}, testInfo) => {
    const notFoundCopy = webPagesCopy.notFound;
    const homePath = `/${LOCALE}`;
    const notFoundPath = `${homePath}/esta-pagina-nao-existe`;

    const response = await page.goto(`${WEB_URL}${notFoundPath}`, {
        waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBe(NOT_FOUND);

    await expect(
        page.getByRole("heading", { level: 1, name: notFoundCopy.title })
    ).toBeVisible();
    await expect(page.getByText(notFoundCopy.description)).toBeVisible();
    await expect(page).toHaveTitle(notFoundTitle);
    await expectAccessible(page, testInfo, { route: `web:${notFoundPath}` });

    await page.getByRole("link", { name: notFoundCopy.goHome }).click();
    await expect(page).toHaveURL(`${WEB_URL}${homePath}`);
    await expect(
        page.getByRole("heading", { level: 1, name: heroTitle })
    ).toBeVisible();
});

test("a first segment that is not a locale answers 404 instead of the home page", async ({
    request,
}) => {
    for (const path of ["/favicon.ico", "/api"]) {
        const response = await request.get(`${WEB_URL}${path}`, {
            maxRedirects: 0,
        });
        expect(response.status(), path).toBe(NOT_FOUND);
    }
});
