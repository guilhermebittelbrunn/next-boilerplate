import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { panelMock, exportMutateMock, deleteMutateMock, privacyPolicyUrlMock } =
    vi.hoisted(() => ({
        panelMock: vi.fn(),
        exportMutateMock: vi.fn(),
        deleteMutateMock: vi.fn(),
        privacyPolicyUrlMock: vi.fn(),
    }));

vi.mock("@/shared/providers/AuthRequestPanelContext", () => ({
    useAuthRequestPanel: () => panelMock(),
}));

vi.mock("@/shared/lib/privacyPolicyUrl", () => ({
    privacyPolicyUrl: (...args: unknown[]) => privacyPolicyUrlMock(...args),
}));

vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(hooks)/useAccountDataRights",
    () => ({
        useAccountDataRights: () => ({
            exportDataMutation: {
                mutate: exportMutateMock,
                isPending: false,
            },
            deleteAccountMutation: {
                mutate: deleteMutateMock,
                isPending: false,
            },
        }),
    })
);

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
    useParams: () => ({ locale: "pt-br" }),
}));

const { AccountPrivacyPanel } = await import(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountPrivacyPanel"
);
const { globalTranslations } = await import(
    "@repo/internationalization/translations/global"
);

const privacyCopy =
    globalTranslations["pt-br"].apps.app.pages.common.account.privacy;

const PASSWORD_ACCOUNT = {
    providerData: [{ providerId: "password", uid: "owner@example.com" }],
} as never;
const GOOGLE_ACCOUNT = {
    providerData: [{ providerId: "google.com", uid: "g-1" }],
} as never;

function openDeleteDialog() {
    const trigger = screen
        .getAllByRole("button", { name: privacyCopy.delete.action })
        .at(-1);
    if (!trigger) {
        throw new Error("o botão que abre o diálogo não foi renderizado");
    }
    fireEvent.click(trigger);
}

beforeEach(() => {
    vi.clearAllMocks();
    panelMock.mockReturnValue({ isImpersonating: false });
    privacyPolicyUrlMock.mockReturnValue(
        "http://localhost:3001/pt-br/legal/privacy"
    );
});

afterEach(cleanup);

describe("AccountPrivacyPanel — exportar dados", () => {
    it("dispara a exportação no clique", () => {
        render(<AccountPrivacyPanel account={PASSWORD_ACCOUNT} />);

        fireEvent.click(
            screen.getByRole("button", { name: privacyCopy.export.action })
        );

        expect(exportMutateMock).toHaveBeenCalledTimes(1);
    });

    it("anuncia o prazo de resposta do canal de privacidade", () => {
        render(<AccountPrivacyPanel account={PASSWORD_ACCOUNT} />);

        expect(screen.getByText(privacyCopy.deadline)).toBeTruthy();
    });

    it("aponta para a política quando a URL da web está configurada", () => {
        render(<AccountPrivacyPanel account={PASSWORD_ACCOUNT} />);

        const link = screen.getByRole("link", {
            name: privacyCopy.policyLink,
        }) as HTMLAnchorElement;

        expect(link.href).toBe("http://localhost:3001/pt-br/legal/privacy");
    });

    it("omite o link em vez de apontar para lugar nenhum sem a URL da web", () => {
        privacyPolicyUrlMock.mockReturnValue(null);
        render(<AccountPrivacyPanel account={PASSWORD_ACCOUNT} />);

        expect(
            screen.queryByRole("link", { name: privacyCopy.policyLink })
        ).toBeNull();
    });
});

describe("AccountPrivacyPanel — excluir conta", () => {
    it("só exclui depois da confirmação com a senha", async () => {
        const { container } = render(
            <AccountPrivacyPanel account={PASSWORD_ACCOUNT} />
        );

        openDeleteDialog();
        expect(screen.getByRole("alertdialog")).toBeTruthy();
        expect(deleteMutateMock).not.toHaveBeenCalled();

        const field = container.ownerDocument.querySelector(
            'input[name="currentPassword"]'
        );
        if (!field) {
            throw new Error("o campo de senha não foi renderizado");
        }
        fireEvent.change(field, { target: { value: "current-secret" } });
        fireEvent.click(
            screen.getByRole("button", { name: privacyCopy.delete.confirm })
        );

        await vi.waitFor(() =>
            expect(deleteMutateMock).toHaveBeenCalledTimes(1)
        );
        expect(deleteMutateMock.mock.calls[0]?.[0]).toEqual({
            currentPassword: "current-secret",
        });
    });

    it("não envia a exclusão com o campo de senha vazio", async () => {
        render(<AccountPrivacyPanel account={PASSWORD_ACCOUNT} />);
        openDeleteDialog();

        fireEvent.click(
            screen.getByRole("button", { name: privacyCopy.delete.confirm })
        );
        await screen.findByText(privacyCopy.delete.validation.required);

        expect(deleteMutateMock).not.toHaveBeenCalled();
    });

    it("fecha o diálogo no cancelar, sem disparar requisição", () => {
        render(<AccountPrivacyPanel account={PASSWORD_ACCOUNT} />);
        openDeleteDialog();

        fireEvent.click(
            screen.getByRole("button", { name: privacyCopy.delete.cancel })
        );

        expect(deleteMutateMock).not.toHaveBeenCalled();
        expect(screen.queryByRole("alertdialog")).toBeNull();
    });
});

describe("AccountPrivacyPanel — estados de exceção", () => {
    it("aponta o canal de privacidade para a conta que só entra pelo Google", () => {
        render(<AccountPrivacyPanel account={GOOGLE_ACCOUNT} />);

        expect(
            screen.getByText(privacyCopy.delete.unsupportedDescription)
        ).toBeTruthy();
        expect(
            screen.queryByRole("button", { name: privacyCopy.delete.action })
        ).toBeNull();
    });

    it("bloqueia as duas ações durante uma personificação", () => {
        panelMock.mockReturnValue({ isImpersonating: true });
        render(<AccountPrivacyPanel account={PASSWORD_ACCOUNT} />);

        const exportButton = screen.getByRole("button", {
            name: privacyCopy.export.action,
        }) as HTMLButtonElement;
        const deleteButton = screen
            .getAllByRole("button", { name: privacyCopy.delete.action })
            .at(-1) as HTMLButtonElement;

        expect(exportButton.disabled).toBe(true);
        expect(deleteButton.disabled).toBe(true);
    });

    it("mantém o formulário de exclusão enquanto a conta ainda não carregou", () => {
        render(<AccountPrivacyPanel account={undefined} />);

        expect(
            screen.getAllByRole("button", { name: privacyCopy.delete.action })
        ).not.toHaveLength(0);
        expect(
            screen.queryByText(privacyCopy.delete.unsupportedDescription)
        ).toBeNull();
    });
});

function passwordField(): HTMLInputElement {
    const field = document.querySelector('input[name="currentPassword"]');
    if (!field) {
        throw new Error("o campo de senha não foi renderizado");
    }
    return field as HTMLInputElement;
}

function deleteTrigger(): HTMLButtonElement {
    const trigger = screen
        .getAllByRole("button", { name: privacyCopy.delete.action })
        .at(-1);
    if (!trigger) {
        throw new Error("o botão que abre o diálogo não foi renderizado");
    }
    return trigger as HTMLButtonElement;
}

function clickFocusedTrigger() {
    const trigger = deleteTrigger();
    trigger.focus();
    fireEvent.click(trigger);
    return { trigger, dialog: screen.getByRole("alertdialog") };
}

async function openFromFocusedTrigger() {
    const opened = clickFocusedTrigger();
    await vi.waitFor(() => {
        if (document.activeElement !== passwordField()) {
            throw new Error("o foco não chegou ao campo de senha");
        }
    });
    return opened;
}

describe("AccountPrivacyPanel — foco do diálogo de exclusão", () => {
    it("leva o foco ao campo de senha quando o diálogo abre", async () => {
        render(<AccountPrivacyPanel account={PASSWORD_ACCOUNT} />);

        const { dialog } = clickFocusedTrigger();

        await vi.waitFor(() =>
            expect(document.activeElement).toBe(passwordField())
        );
        expect(dialog.contains(document.activeElement)).toBe(true);
    });

    it("devolve o foco ao botão que abriu ao fechar pelo Esc", async () => {
        render(<AccountPrivacyPanel account={PASSWORD_ACCOUNT} />);
        const { trigger } = await openFromFocusedTrigger();

        fireEvent.keyDown(passwordField(), { key: "Escape" });

        await vi.waitFor(() =>
            expect(screen.queryByRole("alertdialog")).toBeNull()
        );
        await vi.waitFor(() => expect(document.activeElement).toBe(trigger));
    });

    it("devolve o foco ao botão que abriu ao cancelar", async () => {
        render(<AccountPrivacyPanel account={PASSWORD_ACCOUNT} />);
        const { trigger } = await openFromFocusedTrigger();

        fireEvent.click(
            screen.getByRole("button", { name: privacyCopy.delete.cancel })
        );

        await vi.waitFor(() =>
            expect(screen.queryByRole("alertdialog")).toBeNull()
        );
        await vi.waitFor(() => expect(document.activeElement).toBe(trigger));
    });

    it("mantém o Tab dentro do diálogo", async () => {
        render(<AccountPrivacyPanel account={PASSWORD_ACCOUNT} />);
        await openFromFocusedTrigger();

        const confirmButton = screen.getByRole("button", {
            name: privacyCopy.delete.confirm,
        });
        confirmButton.focus();
        fireEvent.keyDown(confirmButton, { key: "Tab" });

        await vi.waitFor(() =>
            expect(document.activeElement).toBe(passwordField())
        );
    });

    it("limpa a senha digitada ao cancelar", async () => {
        render(<AccountPrivacyPanel account={PASSWORD_ACCOUNT} />);
        await openFromFocusedTrigger();
        fireEvent.change(passwordField(), {
            target: { value: "typed-secret" },
        });

        fireEvent.click(
            screen.getByRole("button", { name: privacyCopy.delete.cancel })
        );
        await vi.waitFor(() =>
            expect(screen.queryByRole("alertdialog")).toBeNull()
        );
        await openFromFocusedTrigger();

        expect(passwordField().value).toBe("");
    });

    it("limpa a mensagem de validação ao fechar pelo Esc", async () => {
        render(<AccountPrivacyPanel account={PASSWORD_ACCOUNT} />);
        await openFromFocusedTrigger();
        fireEvent.click(
            screen.getByRole("button", { name: privacyCopy.delete.confirm })
        );
        await screen.findByText(privacyCopy.delete.validation.required);

        fireEvent.keyDown(passwordField(), { key: "Escape" });
        await vi.waitFor(() =>
            expect(screen.queryByRole("alertdialog")).toBeNull()
        );
        await openFromFocusedTrigger();

        expect(
            screen.queryByText(privacyCopy.delete.validation.required)
        ).toBeNull();
    });
});

type DeleteMutateOptions = { onError?: (error: unknown) => void };

async function submitPassword(password: string) {
    fireEvent.change(passwordField(), { target: { value: password } });
    const confirmButton = screen.getByRole("button", {
        name: privacyCopy.delete.confirm,
    });
    confirmButton.focus();
    fireEvent.click(confirmButton);
    await vi.waitFor(() => {
        if (
            deleteMutateMock.mock.calls.length !== 1 ||
            passwordField().disabled
        ) {
            throw new Error("a exclusão ainda não terminou de ser enviada");
        }
    });
    return confirmButton;
}

function deleteMutateOptions(): DeleteMutateOptions {
    return (deleteMutateMock.mock.calls[0]?.[1] ?? {}) as DeleteMutateOptions;
}

describe("AccountPrivacyPanel — senha recusada pela API", () => {
    it("devolve o foco ao campo de senha com o texto selecionado", async () => {
        render(<AccountPrivacyPanel account={PASSWORD_ACCOUNT} />);
        await openFromFocusedTrigger();
        const confirmButton = await submitPassword("wrong-secret");
        expect(document.activeElement).toBe(confirmButton);

        act(() => {
            deleteMutateOptions().onError?.({
                error: { code: "ACCOUNT_CURRENT_PASSWORD_INVALID" },
            });
        });

        const field = passwordField();
        await vi.waitFor(() => expect(document.activeElement).toBe(field));
        expect(field.value).toBe("wrong-secret");
        expect(field.selectionStart).toBe(0);
        expect(field.selectionEnd).toBe("wrong-secret".length);
        expect(screen.getByRole("alertdialog")).toBeTruthy();
    });

    it("marca o campo como senha atual e obrigatório", () => {
        render(<AccountPrivacyPanel account={PASSWORD_ACCOUNT} />);
        openDeleteDialog();

        const field = passwordField();

        expect(field.getAttribute("autocomplete")).toBe("current-password");
        expect(field.getAttribute("aria-required")).toBe("true");
    });
});
