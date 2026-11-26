import type { AccountDTO } from "@repo/sdk/src/types";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { dialogMock } = vi.hoisted(() => ({ dialogMock: vi.fn() }));

vi.mock("@/shared/providers/AuthRequestPanelContext", () => ({
    useAuthRequestPanel: () => ({ isImpersonating: false }),
}));

vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(hooks)/useAccountMutations",
    () => ({
        useAccountMutations: () => ({
            updateProfileMutation: { mutate: vi.fn(), isPending: false },
        }),
    })
);

vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountEmailChangeDialog",
    () => ({
        AccountEmailChangeDialog: () => {
            dialogMock();
            return null;
        },
    })
);

vi.mock("@/shared/lib/storageEnabled", () => ({
    isStorageEnabled: () => false,
}));

vi.mock("@/shared/hooks/useFileUpload", () => ({
    useFileUpload: () => ({ uploadFile: vi.fn(), isUploading: false }),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
    useParams: () => ({ locale: "pt-br" }),
}));

const { AccountProfileForm } = await import(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountProfileForm"
);
const { globalTranslations } = await import(
    "@repo/internationalization/translations/global"
);

const accountProfile =
    globalTranslations["pt-br"].apps.app.pages.common.account.profile;

const EMAIL = "admin@example.com";

function accountWith(...providerIds: string[]): AccountDTO {
    return {
        email: EMAIL,
        providerData: providerIds.map((providerId) => ({
            providerId,
            uid: `${providerId}-uid`,
            displayName: null,
            email: EMAIL,
            phoneNumber: null,
        })),
    } as unknown as AccountDTO;
}

afterEach(() => {
    cleanup();
    dialogMock.mockReset();
});

describe("AccountProfileForm — troca de e-mail por painel", () => {
    it("por padrão oferece a troca de e-mail e monta o diálogo", () => {
        render(<AccountProfileForm account={accountWith("password")} />);

        expect(
            screen.getByRole("button", {
                name: accountProfile.emailChange.action,
            })
        ).toBeTruthy();
        expect(dialogMock).toHaveBeenCalled();
    });

    it.each([["password"], ["google.com"]])(
        "com allowEmailChange={false} mostra só o e-mail (provedor %s)",
        (provider) => {
            render(
                <AccountProfileForm
                    account={accountWith(provider)}
                    allowEmailChange={false}
                />
            );

            expect(
                screen
                    .getByRole("textbox", { name: accountProfile.email })
                    .getAttribute("value")
            ).toBe(EMAIL);
            expect(
                screen.queryByRole("button", {
                    name: accountProfile.emailChange.action,
                })
            ).toBeNull();
            expect(
                screen.queryByText(accountProfile.emailChange.unsupported)
            ).toBeNull();
            expect(dialogMock).not.toHaveBeenCalled();
        }
    );
});
