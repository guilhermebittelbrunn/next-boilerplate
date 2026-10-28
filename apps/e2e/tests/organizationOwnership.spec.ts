import { expect, type Page, test } from "@playwright/test";
import { expectAccessible } from "../support/a11y";
import { LOCALE, ptBr } from "../support/dictionary";
import {
    organizationIdOf,
    profileIdOf,
    seedInvitation,
} from "../support/firestoreEmulator";
import { SEED_PASSWORD } from "../support/seedAccounts";
import { passwordInput, signInThroughForm } from "../support/signIn";
import { APP_URL } from "../support/urls";

const organizationCopy = ptBr.apps.app.pages.common.organization;
const invitationCopy = ptBr.apps.app.pages.invitation;
const signUpCopy = ptBr.apps.app.pages.signUp;
const onboardingCopy = ptBr.apps.app.pages.onboarding;
const actionMenuCopy = ptBr.components.actionMenu;

const organizationPath = `/${LOCALE}/organization`;
// Not used by any other spec, so the team built here cannot disturb them.
const OWNER = { email: "user2@example.com", password: SEED_PASSWORD };
const INVITEE_NAME = "E2E Team Member";

const memberRow = (page: Page, email: string) =>
    page.getByRole("row").filter({ hasText: email });

const roleBadge = (page: Page, email: string, role: "owner" | "member") =>
    memberRow(page, email).getByText(organizationCopy.members.roles[role], {
        exact: true,
    });

async function signUpAndOnboard(page: Page, email: string) {
    await page.goto(`/${LOCALE}/sign-up`);
    await page.getByLabel(signUpCopy.form.email).fill(email);
    await passwordInput(page).fill(SEED_PASSWORD);
    await passwordInput(page, "confirmPassword").fill(SEED_PASSWORD);
    await page
        .locator("form")
        .getByRole("button", { name: signUpCopy.form.submit, exact: true })
        .click();

    await expect(page).toHaveURL(`${APP_URL}/${LOCALE}/onboarding`);
    await page
        .getByLabel(onboardingCopy.steps.profile.displayName)
        .fill(INVITEE_NAME);
    await page
        .getByRole("button", { name: onboardingCopy.actions.next })
        .click();
    await page
        .getByRole("button", { name: onboardingCopy.actions.skip })
        .click();
    await expect(page).toHaveURL(`${APP_URL}/${LOCALE}`);
}

test("a member joins by invitation, receives ownership and the previous owner leaves", async ({
    browser,
}, testInfo) => {
    const inviteeEmail = `e2e-team-${Date.now()}@example.com`;
    const ownerContext = await browser.newContext();
    const inviteeContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    const inviteePage = await inviteeContext.newPage();

    try {
        await signInThroughForm(ownerPage, OWNER);
        await expect(ownerPage).toHaveURL(`${APP_URL}/${LOCALE}`);
        await ownerPage.goto(organizationPath);
        await expect(roleBadge(ownerPage, OWNER.email, "owner")).toBeVisible();

        const ownerProfileId = await profileIdOf(OWNER.email, OWNER.password);
        const token = await seedInvitation({
            organizationId: await organizationIdOf(ownerProfileId),
            email: inviteeEmail,
            invitedByUserId: ownerProfileId,
            inviterEmail: OWNER.email,
        });
        await ownerPage.reload();
        await expect(
            ownerPage.getByText(organizationCopy.invitations.title)
        ).toBeVisible();
        await expect(memberRow(ownerPage, inviteeEmail)).toBeVisible();

        await signUpAndOnboard(inviteePage, inviteeEmail);
        await inviteePage.goto(
            `/${LOCALE}/invite?token=${encodeURIComponent(token)}`
        );
        await inviteePage
            .getByRole("button", { name: invitationCopy.accept })
            .click();
        await expect(inviteePage).toHaveURL(`${APP_URL}${organizationPath}`);
        await expect(
            roleBadge(inviteePage, inviteeEmail, "member")
        ).toBeVisible();
        await expect(
            roleBadge(inviteePage, OWNER.email, "owner")
        ).toBeVisible();

        await ownerPage.reload();
        await memberRow(ownerPage, inviteeEmail)
            .getByRole("button", { name: actionMenuCopy.trigger })
            .click();
        await ownerPage
            .getByRole("menuitem", { name: organizationCopy.transfer.action })
            .click();
        const dialog = ownerPage.getByRole("alertdialog");
        await expect(
            dialog.getByText(organizationCopy.transfer.confirmTitle)
        ).toBeVisible();
        await dialog
            .getByRole("button", { name: organizationCopy.transfer.confirm })
            .click();

        await expect(
            ownerPage.getByText(
                organizationCopy.transfer.done.replace("{name}", INVITEE_NAME)
            )
        ).toBeVisible();
        await expect(roleBadge(ownerPage, OWNER.email, "member")).toBeVisible();
        await expect(roleBadge(ownerPage, inviteeEmail, "owner")).toBeVisible();
        await expect(
            ownerPage.getByText(organizationCopy.invite.title)
        ).toHaveCount(0);
        const leaveButton = ownerPage.getByRole("button", {
            name: organizationCopy.leave.action,
        });
        await expect(leaveButton).toBeVisible();

        await leaveButton.click();
        await ownerPage
            .getByRole("alertdialog")
            .getByRole("button", { name: organizationCopy.leave.confirm })
            .click();
        await expect(
            ownerPage.getByText(organizationCopy.leave.done)
        ).toBeVisible();
        await expect(roleBadge(ownerPage, OWNER.email, "owner")).toBeVisible();
        await expect(memberRow(ownerPage, inviteeEmail)).toHaveCount(0);

        await inviteePage.reload();
        await expect(
            roleBadge(inviteePage, inviteeEmail, "owner")
        ).toBeVisible();
        await expect(memberRow(inviteePage, OWNER.email)).toHaveCount(0);
        await expect(
            inviteePage.getByText(organizationCopy.invite.title)
        ).toBeVisible();
        await expectAccessible(inviteePage, testInfo, {
            route: organizationPath,
        });
    } finally {
        await ownerContext.close();
        await inviteeContext.close();
    }
});
