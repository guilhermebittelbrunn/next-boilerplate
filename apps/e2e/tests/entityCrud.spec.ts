import { expect, type Locator, type Page, test } from "@playwright/test";
import { expectAccessible } from "../support/a11y";
import { LOCALE, ptBr } from "../support/dictionary";
import { AUTH_STATE } from "../support/paths";
import { SEEDED_ENTITY_NAME } from "../support/seedAccounts";
import { APP_URL } from "../support/urls";

test.use({ storageState: AUTH_STATE.common });

const entitiesCopy = ptBr.apps.app.pages.common.entities;
const actionMenuCopy = ptBr.components.actionMenu;
const listPath = `/${LOCALE}/entities`;

const rowNamed = (page: Page, name: string) =>
    page.getByRole("row").filter({ hasText: name });

// The row menu trigger is a plain <div> around an icon, with no role or name to query.
const openRowActions = async (row: Locator) => {
    await row.getByRole("cell").last().locator("svg").click();
};

test("creates, edits and deletes an entity", async ({ page }, testInfo) => {
    const createdName = `E2E ${Date.now()}`;
    const editedName = `${createdName} edited`;

    await page.goto(listPath);
    await expect(rowNamed(page, SEEDED_ENTITY_NAME)).toBeVisible();
    await expectAccessible(page, testInfo, { route: listPath });

    await page
        .getByRole("button", { name: ptBr.components.button.add })
        .click();
    await expect(page).toHaveURL(`${APP_URL}${listPath}/create`);
    const nameInput = page.getByLabel(entitiesCopy.form.name);
    await expect(nameInput).toBeVisible();
    await expectAccessible(page, testInfo, { route: `${listPath}/create` });

    await nameInput.fill(createdName);
    await page
        .getByRole("combobox")
        .filter({ hasText: entitiesCopy.list.typeLabels.customer })
        .click();
    await page
        .getByRole("option", { name: entitiesCopy.list.typeLabels.franchise })
        .click();
    await page.getByRole("button", { name: entitiesCopy.form.save }).click();

    await expect(page).toHaveURL(`${APP_URL}${listPath}`);
    const createdRow = rowNamed(page, createdName);
    await expect(createdRow).toBeVisible();
    await expect(createdRow).toContainText(
        entitiesCopy.list.typeLabels.franchise
    );

    await openRowActions(createdRow);
    await page.getByRole("menuitem", { name: actionMenuCopy.edit }).click();
    await expect(page).toHaveURL(new RegExp(`${listPath}/edit/[^/]+$`));
    const editNameInput = page.getByLabel(entitiesCopy.form.name);
    await expect(editNameInput).toHaveValue(createdName);
    await expectAccessible(page, testInfo, { route: `${listPath}/edit/[id]` });

    await editNameInput.fill(editedName);
    await page.getByRole("button", { name: entitiesCopy.form.save }).click();

    await expect(page).toHaveURL(`${APP_URL}${listPath}`);
    const editedRow = rowNamed(page, editedName);
    await expect(editedRow).toBeVisible();

    await openRowActions(editedRow);
    await page.getByRole("menuitem", { name: actionMenuCopy.delete }).click();
    await page
        .getByRole("button", { name: actionMenuCopy.deleteConfirmOk })
        .click();

    await expect(editedRow).toHaveCount(0);
    await expect(rowNamed(page, SEEDED_ENTITY_NAME)).toBeVisible();
});
