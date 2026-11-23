import { expect, type Page } from "@playwright/test";
import { ptBr } from "./dictionary";

const sidebarCopy = ptBr.components.sidebar;
const SHEET_OPEN_TIMEOUT = 30_000;
const SHEET_RETRY_TIMEOUT = 2000;

/**
 * Below the sidebar breakpoint the panel navigation lives in a closed sheet, so its
 * links only exist after the toggle opens it.
 */
export async function expectPanelNavLink(
    page: Page,
    name: string,
    isMobile: boolean
) {
    if (isMobile) {
        const sheet = page.getByRole("dialog", {
            name: sidebarCopy.mobileTitle,
        });
        // A tap that lands before the panel hydrates does nothing, so the toggle is
        // pressed again while the sheet is still closed.
        await expect(async () => {
            if (!(await sheet.isVisible())) {
                await page
                    .getByRole("button", { name: sidebarCopy.toggle })
                    .click();
            }
            await expect(sheet).toBeVisible({ timeout: SHEET_RETRY_TIMEOUT });
        }).toPass({ timeout: SHEET_OPEN_TIMEOUT });
    }
    await expect(page.getByRole("link", { name })).toBeVisible();
}
