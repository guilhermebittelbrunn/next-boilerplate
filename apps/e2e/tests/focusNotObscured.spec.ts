import { expect, type Page, test } from "@playwright/test";
import { LOCALE, ptBr } from "../support/dictionary";
import { AUTH_STATE } from "../support/paths";
import { SEEDED_ENTITY_NAME } from "../support/seedAccounts";

test.use({
    storageState: AUTH_STATE.common,
    viewport: { width: 375, height: 812 },
});

const entitiesForm = ptBr.apps.app.pages.common.entities.form;
const actionMenuCopy = ptBr.components.actionMenu;
const listPath = `/${LOCALE}/entities`;
const createPath = `${listPath}/create`;

const ACTION_BAR = "[data-sticky-action-bar]";
const PANEL_NAVBAR = "[data-panel-navbar]";
const MAX_FOCUS_STOPS = 40;
const LONG_DESCRIPTION_LINES = 12;
const LONG_DESCRIPTION = Array.from(
    { length: LONG_DESCRIPTION_LINES },
    (_, line) => `${line + 1}`
).join("\n");
const NAVBAR_OVERLAP = 24;
const ACTION_BAR_GAP = 4;

/**
 * Describes how the focused control overlaps the sticky bars, or "" when it is fully
 * clear of them. Controls that live inside a bar are never covered by it.
 */
const focusOverlap = (page: Page) =>
    page.evaluate(
        ({ actionBar, panelNavbar }) => {
            const active = document.activeElement;
            if (
                !active ||
                active === document.body ||
                active.closest(`${actionBar},${panelNavbar}`)
            ) {
                return "";
            }
            const rect = active.getBoundingClientRect();
            const bar = document
                .querySelector(actionBar)
                ?.getBoundingClientRect();
            const nav = document
                .querySelector(panelNavbar)
                ?.getBoundingClientRect();
            const name =
                active.getAttribute("aria-label") ||
                active.id ||
                active.tagName.toLowerCase();
            if (bar && rect.bottom > bar.top) {
                return `${name} ends at ${rect.bottom}px, under the action bar that starts at ${bar.top}px`;
            }
            if (nav && rect.top < nav.bottom) {
                return `${name} starts at ${rect.top}px, under the navbar that ends at ${nav.bottom}px`;
            }
            return "";
        },
        { actionBar: ACTION_BAR, panelNavbar: PANEL_NAVBAR }
    );

// The document scrolls smoothly, so the focused control can still be on its way.
const expectFocusUnobscured = async (page: Page) => {
    await expect.poll(() => focusOverlap(page)).toBe("");
};

const focusIsInside = (page: Page, selector: string) =>
    page.evaluate(
        (container) => Boolean(document.activeElement?.closest(container)),
        selector
    );

const fieldsStartingUnderActionBar = (page: Page) =>
    page.evaluate(
        ({ actionBar, panelNavbar }) => {
            const bar = document
                .querySelector(actionBar)
                ?.getBoundingClientRect();
            if (!bar) {
                return 0;
            }
            const controls = document.querySelectorAll(
                "input:not([type=hidden]), textarea, select, button, [tabindex]:not([tabindex='-1'])"
            );
            return [...controls].filter(
                (control) =>
                    !control.closest(`${actionBar},${panelNavbar}`) &&
                    control.getBoundingClientRect().top > bar.top
            ).length;
        },
        { actionBar: ACTION_BAR, panelNavbar: PANEL_NAVBAR }
    );

const expectFormWithStickyBars = async (page: Page) => {
    await expect(page.getByLabel(entitiesForm.name)).toBeVisible();
    await expect(page.locator(ACTION_BAR)).toBeVisible();
    await expect(page.locator(PANEL_NAVBAR)).toBeVisible();
};

test("Tab and Shift+Tab keep every focused field clear of the sticky bars", async ({
    page,
}) => {
    await page.goto(createPath);
    await expectFormWithStickyBars(page);

    // A longer description pushes the lower fields under the action bar, so the Tab walk
    // has to scroll the document.
    const descriptionInput = page.getByLabel(entitiesForm.description);
    await descriptionInput.fill(LONG_DESCRIPTION);
    // Focusing a textarea scrolls its caret into view, not the whole field. With the caret
    // on the last line, Shift+Tab would leave the top of the description under the navbar.
    await descriptionInput.evaluate((textarea: HTMLTextAreaElement) =>
        textarea.setSelectionRange(0, 0)
    );
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));

    const nameInput = page.getByLabel(entitiesForm.name);
    await nameInput.focus();
    await expectFocusUnobscured(page);
    expect(
        await fieldsStartingUnderActionBar(page),
        "some field must start under the action bar with the page at the top"
    ).toBeGreaterThan(0);

    let stops = 0;
    while (!(await focusIsInside(page, ACTION_BAR))) {
        expect(stops, "focus never reached the action bar").toBeLessThan(
            MAX_FOCUS_STOPS
        );
        await page.keyboard.press("Tab");
        await expectFocusUnobscured(page);
        stops += 1;
    }
    expect(
        await page.evaluate(() => window.scrollY),
        "the Tab walk must scroll the document"
    ).toBeGreaterThan(0);

    stops = 0;
    while (!(await nameInput.evaluate((el) => el === document.activeElement))) {
        expect(stops, "focus never returned to the name field").toBeLessThan(
            MAX_FOCUS_STOPS
        );
        await page.keyboard.press("Shift+Tab");
        await expectFocusUnobscured(page);
        stops += 1;
    }
});

// Moving focus back to a field that is still on screen, but under the navbar, does not
// scroll unless the document reserves the navbar's height.
test("Shift+Tab brings a field out from under the navbar", async ({ page }) => {
    await page.goto(createPath);
    await expectFormWithStickyBars(page);

    // The description grows with its content, which gives the page room to scroll the
    // type field, the one right before it, up under the navbar.
    const descriptionInput = page.getByLabel(entitiesForm.description);
    await descriptionInput.fill(LONG_DESCRIPTION);
    await descriptionInput.focus();

    const typeTrigger = page.getByRole("combobox", { name: entitiesForm.type });
    await typeTrigger.evaluate(
        (field, { panelNavbar, overlap }) => {
            const nav = document
                .querySelector(panelNavbar)
                ?.getBoundingClientRect();
            if (nav) {
                window.scrollBy({
                    top:
                        field.getBoundingClientRect().top -
                        (nav.bottom - overlap),
                    behavior: "instant",
                });
            }
        },
        { panelNavbar: PANEL_NAVBAR, overlap: NAVBAR_OVERLAP }
    );

    const navbarBottom = await page
        .locator(PANEL_NAVBAR)
        .evaluate((el) => el.getBoundingClientRect().bottom);
    const typeTop = await typeTrigger.evaluate(
        (el) => el.getBoundingClientRect().top
    );
    expect(
        typeTop,
        "the type field must stay on screen"
    ).toBeGreaterThanOrEqual(0);
    expect(typeTop, "the type field must start under the navbar").toBeLessThan(
        navbarBottom
    );

    await page.keyboard.press("Shift+Tab");
    await expect(typeTrigger).toBeFocused();
    await expectFocusUnobscured(page);
});

// A long description pushes the genre group of the edit form below the fold; the page is
// then scrolled so the checked option sits just above the action bar and the options
// after it start under the bar.
test("arrow keys keep the focused genre option clear of the action bar", async ({
    page,
}) => {
    await page.goto(listPath);
    const editItem = page.getByRole("menuitem", { name: actionMenuCopy.edit });
    // A click that lands before the row's dropdown hydrates is lost, so the trigger is
    // pressed again while the menu is still closed.
    await expect(async () => {
        if (!(await editItem.isVisible())) {
            await page
                .getByRole("row")
                .filter({ hasText: SEEDED_ENTITY_NAME })
                .getByRole("button", { name: actionMenuCopy.trigger })
                .click();
        }
        await expect(editItem).toBeVisible({ timeout: 2000 });
    }).toPass();
    await editItem.click();
    await expect(page.getByLabel(entitiesForm.name)).toHaveValue(
        SEEDED_ENTITY_NAME
    );
    await expectFormWithStickyBars(page);
    await page.getByLabel(entitiesForm.description).fill(LONG_DESCRIPTION);

    const genreGroup = page.getByRole("radiogroup", {
        name: entitiesForm.genre,
    });
    const options = genreGroup.getByRole("radio");
    const optionCount = await options.count();
    expect(optionCount).toBeGreaterThan(1);

    const checkedOption = genreGroup.getByRole("radio", { checked: true });
    await checkedOption.evaluate(
        (radio, { actionBar, gap }) => {
            const bar = document
                .querySelector(actionBar)
                ?.getBoundingClientRect();
            if (bar) {
                window.scrollBy({
                    top: radio.getBoundingClientRect().bottom - (bar.top - gap),
                    behavior: "instant",
                });
            }
        },
        { actionBar: ACTION_BAR, gap: ACTION_BAR_GAP }
    );
    await checkedOption.focus();
    await expectFocusUnobscured(page);

    const lastOptionTop = await options
        .last()
        .evaluate((el) => el.getBoundingClientRect().top);
    const barTop = await page
        .locator(ACTION_BAR)
        .evaluate((el) => el.getBoundingClientRect().top);
    expect(
        lastOptionTop,
        "the last option must start under the bar"
    ).toBeGreaterThan(barTop);

    const checkedIndex = await options.evaluateAll((radios) =>
        radios.findIndex(
            (radio) => radio.getAttribute("aria-checked") === "true"
        )
    );
    expect(
        checkedIndex,
        "the checked option must have options below it"
    ).toBeLessThan(optionCount - 1);
    for (let index = checkedIndex + 1; index < optionCount; index += 1) {
        await page.keyboard.press("ArrowDown");
        await expect(options.nth(index)).toBeFocused();
        await expectFocusUnobscured(page);
    }
});
