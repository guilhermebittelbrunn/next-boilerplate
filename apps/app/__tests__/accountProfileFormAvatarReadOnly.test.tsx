import type { AccountDTO } from "@repo/sdk/src/types";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { impersonatingMock } = vi.hoisted(() => ({
    impersonatingMock: vi.fn(() => false),
}));

vi.mock("@/shared/providers/AuthRequestPanelContext", () => ({
    useAuthRequestPanel: () => ({ isImpersonating: impersonatingMock() }),
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
    () => ({ AccountEmailChangeDialog: () => null })
);

vi.mock("@/shared/lib/storageEnabled", () => ({
    isStorageEnabled: () => true,
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

const avatarUpload =
    globalTranslations["pt-br"].apps.app.pages.common.account.profile
        .avatarUpload;

const ACCOUNT_WITHOUT_AVATAR = {
    displayName: "Ana",
    email: "ana@example.com",
    avatar: null,
    avatarUrl: null,
    providerData: [],
} as unknown as AccountDTO;

const ACCOUNT_WITH_AVATAR = {
    ...ACCOUNT_WITHOUT_AVATAR,
    avatar: "users/ana/avatar.png",
    avatarUrl: "https://example.com/avatar.png",
} as unknown as AccountDTO;

function fileInput() {
    const input =
        document.querySelector<HTMLInputElement>("input[type='file']");
    if (!input) {
        throw new Error("file input not rendered");
    }
    return input;
}

function button(name: string) {
    return screen.getByRole<HTMLButtonElement>("button", { name });
}

afterEach(() => {
    cleanup();
    impersonatingMock.mockReset();
    impersonatingMock.mockReturnValue(false);
});

describe("AccountProfileForm — upload de avatar em modo só leitura", () => {
    it("desabilita escolher imagem e o input de arquivo sob personificação", () => {
        impersonatingMock.mockReturnValue(true);

        render(<AccountProfileForm account={ACCOUNT_WITHOUT_AVATAR} />);

        expect(button(avatarUpload.choose).disabled).toBe(true);
        expect(fileInput().disabled).toBe(true);
    });

    it("desabilita trocar e remover quando já há avatar sob personificação", async () => {
        impersonatingMock.mockReturnValue(true);

        render(<AccountProfileForm account={ACCOUNT_WITH_AVATAR} />);

        const replaceButton = await screen.findByRole<HTMLButtonElement>(
            "button",
            { name: avatarUpload.replace }
        );
        expect(replaceButton.disabled).toBe(true);
        expect(button(avatarUpload.remove).disabled).toBe(true);
        expect(fileInput().disabled).toBe(true);
    });

    it("mantém escolher imagem habilitado fora da personificação", () => {
        render(<AccountProfileForm account={ACCOUNT_WITHOUT_AVATAR} />);

        expect(button(avatarUpload.choose).disabled).toBe(false);
        expect(fileInput().disabled).toBe(false);
    });

    it("mantém trocar e remover habilitados fora da personificação", async () => {
        render(<AccountProfileForm account={ACCOUNT_WITH_AVATAR} />);

        const replaceButton = await screen.findByRole<HTMLButtonElement>(
            "button",
            { name: avatarUpload.replace }
        );
        expect(replaceButton.disabled).toBe(false);
        expect(button(avatarUpload.remove).disabled).toBe(false);
        expect(fileInput().disabled).toBe(false);
    });
});
