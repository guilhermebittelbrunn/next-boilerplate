import { expect, type Locator, type Page, test } from "@playwright/test";
import { expectAccessible } from "../support/a11y";
import { LOCALE, ptBr } from "../support/dictionary";
import { AUTH_STATE } from "../support/paths";
import { escapeRegExp } from "../support/regExp";
import { SEEDED_ENTITY_NAME } from "../support/seedAccounts";
import { APP_URL } from "../support/urls";

test.use({ storageState: AUTH_STATE.common });

const entitiesCopy = ptBr.apps.app.pages.common.entities;
const actionMenuCopy = ptBr.components.actionMenu;
const entityRoutesCopy = ptBr.apps.app.pages.common.routes.platform.entities;
const listPath = `/${LOCALE}/entities`;

const screenTitled = (label: string) =>
    new RegExp(`^${escapeRegExp(label)} \\| .+`);

const rowNamed = (page: Page, name: string) =>
    page.getByRole("row").filter({ hasText: name });

const openRowActions = async (row: Locator) => {
    await row.getByRole("button", { name: actionMenuCopy.trigger }).click();
};

test("creates, edits and deletes an entity", async ({ page }, testInfo) => {
    const createdName = `E2E ${Date.now()}`;
    const editedName = `${createdName} edited`;

    await page.goto(listPath);
    await expect(rowNamed(page, SEEDED_ENTITY_NAME)).toBeVisible();
    await expect(page).toHaveTitle(screenTitled(entityRoutesCopy.list));
    await expectAccessible(page, testInfo, { route: listPath });

    await page
        .getByRole("button", { name: ptBr.components.button.add })
        .click();
    await expect(page).toHaveURL(`${APP_URL}${listPath}/create`);
    const nameInput = page.getByLabel(entitiesCopy.form.name);
    await expect(nameInput).toBeVisible();
    await expect(page).toHaveTitle(screenTitled(entityRoutesCopy.create));
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
    await expect(page).toHaveTitle(screenTitled(entityRoutesCopy.update));
    await expectAccessible(page, testInfo, { route: `${listPath}/edit/[id]` });

    await editNameInput.fill(editedName);
    await page.getByRole("button", { name: entitiesCopy.form.save }).click();

    await expect(page).toHaveURL(`${APP_URL}${listPath}`);
    const editedRow = rowNamed(page, editedName);
    await expect(editedRow).toBeVisible();

    const editedRowIndex = await editedRow.evaluate((row) =>
        Array.from(row.parentElement?.children ?? []).indexOf(row)
    );

    await openRowActions(editedRow);
    await page.getByRole("menuitem", { name: actionMenuCopy.delete }).click();
    await page
        .getByRole("button", { name: actionMenuCopy.deleteConfirmOk })
        .click();

    await expect(editedRow).toHaveCount(0);
    await expect(rowNamed(page, SEEDED_ENTITY_NAME)).toBeVisible();

    const remainingRows = page.locator("tbody > tr");
    const neighbourIndex = Math.min(
        editedRowIndex,
        (await remainingRows.count()) - 1
    );
    await expect(
        remainingRows
            .nth(neighbourIndex)
            .getByRole("button", { name: actionMenuCopy.trigger })
    ).toBeFocused();
});
