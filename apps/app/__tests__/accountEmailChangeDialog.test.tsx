import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
    panelMock,
    updateMock,
    requestEmailChangeMock,
    successAlertMock,
    errorAlertMock,
} = vi.hoisted(() => ({
    panelMock: vi.fn(),
    updateMock: vi.fn(),
    requestEmailChangeMock: vi.fn(),
    successAlertMock: vi.fn(),
    errorAlertMock: vi.fn(),
}));

vi.mock("@/shared/providers/AuthRequestPanelContext", () => ({
    useAuthRequestPanel: () => panelMock(),
}));

vi.mock("@/shared/lib/client", () => ({
    apiClient: {
        account: {
            update: (...args: unknown[]) => updateMock(...args),
            requestEmailChange: (...args: unknown[]) =>
                requestEmailChangeMock(...args),
        },
    },
}));

vi.mock("@/shared/lib/storageEnabled", () => ({
    isStorageEnabled: () => false,
}));

vi.mock("@/shared/hooks/useFileUpload", () => ({
    useFileUpload: () => ({ uploadFile: vi.fn(), isUploading: false }),
}));

vi.mock("@repo/design-system/hooks/useAlert", () => ({
    default: () => ({
        successAlert: successAlertMock,
        errorAlert: errorAlertMock,
    }),
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

const accountCopy = globalTranslations["pt-br"].apps.app.pages.common.account;
const emailChangeCopy = accountCopy.profile.emailChange;

const CURRENT_EMAIL = "owner@example.com";
const NEW_EMAIL = "owner.new@example.com";

const PASSWORD_ACCOUNT = {
    email: CURRENT_EMAIL,
    displayName: "Jane",
    phone: null,
    avatar: null,
    avatarUrl: null,
    providerData: [{ providerId: "password", uid: CURRENT_EMAIL }],
} as never;
const GOOGLE_ACCOUNT = {
    email: CURRENT_EMAIL,
    displayName: "Jane",
    phone: null,
    avatar: null,
    avatarUrl: null,
    providerData: [{ providerId: "google.com", uid: "g-1" }],
} as never;

let queryClient: QueryClient;

function renderForm(account: unknown) {
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
    return render(<AccountProfileForm account={account as never} />, {
        wrapper,
    });
}

function openDialog() {
    fireEvent.click(
        screen.getByRole("button", { name: emailChangeCopy.action })
    );
    return screen.getByRole("alertdialog");
}

function fieldNamed(name: string): HTMLInputElement {
    const field = document.querySelector(`input[name="${name}"]`);
    if (!field) {
        throw new Error(`o campo ${name} não foi renderizado`);
    }
    return field as HTMLInputElement;
}

function fillAndSubmit(newEmail: string, password: string) {
    fireEvent.change(fieldNamed("newEmail"), { target: { value: newEmail } });
    fireEvent.change(fieldNamed("currentPassword"), {
        target: { value: password },
    });
    fireEvent.click(
        screen.getByRole("button", { name: emailChangeCopy.confirm })
    );
}

beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    panelMock.mockReturnValue({ isImpersonating: false });
    requestEmailChangeMock.mockResolvedValue({ requested: true });
    updateMock.mockResolvedValue({});
});

afterEach(cleanup);

describe("AccountProfileForm — troca de e-mail", () => {
    it("não mostra mais a frase de 'em breve'", () => {
        renderForm(PASSWORD_ACCOUNT);

        for (const phrase of [
            "A troca de e-mail estará disponível em breve.",
            "Changing your e-mail will be available soon.",
            "El cambio de correo estará disponible pronto.",
        ]) {
            expect(screen.queryByText(phrase)).toBeNull();
        }
    });

    it("pede a troca com o idioma atual e não dispara o salvar do perfil", async () => {
        renderForm(PASSWORD_ACCOUNT);
        openDialog();

        fillAndSubmit(` ${NEW_EMAIL} `, "current-secret");

        await vi.waitFor(() =>
            expect(requestEmailChangeMock).toHaveBeenCalledTimes(1)
        );
        expect(requestEmailChangeMock).toHaveBeenCalledWith({
            newEmail: NEW_EMAIL,
            currentPassword: "current-secret",
            locale: "pt-br",
        });
        expect(updateMock).not.toHaveBeenCalled();
    });

    it("fecha o diálogo e confirma com a copy do dicionário no sucesso", async () => {
        renderForm(PASSWORD_ACCOUNT);
        openDialog();

        fillAndSubmit(NEW_EMAIL, "current-secret");

        await vi.waitFor(() =>
            expect(successAlertMock).toHaveBeenCalledWith(
                accountCopy.messages.emailChangeRequested
            )
        );
        await vi.waitFor(() =>
            expect(screen.queryByRole("alertdialog")).toBeNull()
        );
    });

    it("mantém o diálogo aberto e mostra o erro quando a API recusa", async () => {
        requestEmailChangeMock.mockRejectedValue({
            error: { code: "EMAIL_NOT_CONFIGURED" },
        });
        renderForm(PASSWORD_ACCOUNT);
        openDialog();

        fillAndSubmit(NEW_EMAIL, "current-secret");

        await vi.waitFor(() => expect(errorAlertMock).toHaveBeenCalled());
        expect(successAlertMock).not.toHaveBeenCalled();
        expect(screen.getByRole("alertdialog")).toBeTruthy();
    });

    it("recusa no diálogo o endereço atual, sem diferenciar maiúsculas", async () => {
        renderForm(PASSWORD_ACCOUNT);
        openDialog();

        fillAndSubmit("OWNER@Example.com", "current-secret");

        await screen.findByText(emailChangeCopy.validation.emailSameAsCurrent);
        expect(requestEmailChangeMock).not.toHaveBeenCalled();
    });

    it("não envia com os campos vazios", async () => {
        renderForm(PASSWORD_ACCOUNT);
        openDialog();

        fireEvent.click(
            screen.getByRole("button", { name: emailChangeCopy.confirm })
        );

        await screen.findByText(emailChangeCopy.validation.emailRequired);
        await screen.findByText(emailChangeCopy.validation.passwordRequired);
        expect(requestEmailChangeMock).not.toHaveBeenCalled();
    });

    it("limpa os campos ao cancelar", () => {
        renderForm(PASSWORD_ACCOUNT);
        openDialog();
        fireEvent.change(fieldNamed("newEmail"), {
            target: { value: NEW_EMAIL },
        });

        fireEvent.click(
            screen.getByRole("button", { name: emailChangeCopy.cancel })
        );
        expect(screen.queryByRole("alertdialog")).toBeNull();

        openDialog();
        expect(fieldNamed("newEmail").value).toBe("");
        expect(requestEmailChangeMock).not.toHaveBeenCalled();
    });

    it("bloqueia o segundo clique enquanto o pedido está em andamento", async () => {
        requestEmailChangeMock.mockReturnValue(
            new Promise(() => {
                // never settles, so the request stays pending
            })
        );
        renderForm(PASSWORD_ACCOUNT);
        openDialog();

        fillAndSubmit(NEW_EMAIL, "current-secret");
        await vi.waitFor(() =>
            expect(requestEmailChangeMock).toHaveBeenCalledTimes(1)
        );

        const confirmButton = screen.getByRole("button", {
            name: emailChangeCopy.confirm,
        }) as HTMLButtonElement;
        await vi.waitFor(() => expect(confirmButton.disabled).toBe(true));
        fireEvent.click(confirmButton);

        expect(requestEmailChangeMock).toHaveBeenCalledTimes(1);
    });

    it("explica a conta só Google em vez de oferecer o botão", () => {
        renderForm(GOOGLE_ACCOUNT);

        expect(screen.getByText(emailChangeCopy.unsupported)).toBeTruthy();
        expect(
            screen.queryByRole("button", { name: emailChangeCopy.action })
        ).toBeNull();
    });

    it("desabilita o botão durante uma personificação", () => {
        panelMock.mockReturnValue({ isImpersonating: true });
        renderForm(PASSWORD_ACCOUNT);

        const button = screen.getByRole("button", {
            name: emailChangeCopy.action,
        }) as HTMLButtonElement;

        expect(button.disabled).toBe(true);
    });

    it("leva o foco ao campo do novo e-mail quando o diálogo abre", async () => {
        renderForm(PASSWORD_ACCOUNT);
        const trigger = screen.getByRole("button", {
            name: emailChangeCopy.action,
        });
        trigger.focus();

        fireEvent.click(trigger);

        const dialog = screen.getByRole("alertdialog");
        await vi.waitFor(() =>
            expect(document.activeElement).toBe(fieldNamed("newEmail"))
        );
        expect(dialog.contains(document.activeElement)).toBe(true);
    });

    describe("devolve o foco ao botão que abriu o diálogo", () => {
        function openDialogFromTrigger() {
            const trigger = screen.getByRole("button", {
                name: emailChangeCopy.action,
            });
            trigger.focus();
            fireEvent.click(trigger);
            const dialog = screen.getByRole("alertdialog");
            const newEmailField = fieldNamed("newEmail");
            return { trigger, dialog, newEmailField };
        }

        it("ao fechar pelo Esc", async () => {
            renderForm(PASSWORD_ACCOUNT);
            const { trigger, dialog, newEmailField } = openDialogFromTrigger();
            await vi.waitFor(() =>
                expect(document.activeElement).toBe(newEmailField)
            );
            expect(dialog.contains(document.activeElement)).toBe(true);

            fireEvent.keyDown(newEmailField, { key: "Escape" });

            await vi.waitFor(() =>
                expect(screen.queryByRole("alertdialog")).toBeNull()
            );
            await vi.waitFor(() =>
                expect(document.activeElement).toBe(trigger)
            );
        });

        it("ao cancelar", async () => {
            renderForm(PASSWORD_ACCOUNT);
            const { trigger, dialog, newEmailField } = openDialogFromTrigger();
            await vi.waitFor(() =>
                expect(document.activeElement).toBe(newEmailField)
            );
            expect(dialog.contains(document.activeElement)).toBe(true);

            fireEvent.click(
                screen.getByRole("button", { name: emailChangeCopy.cancel })
            );

            await vi.waitFor(() =>
                expect(document.activeElement).toBe(trigger)
            );
        });

        it("depois do pedido aceito", async () => {
            renderForm(PASSWORD_ACCOUNT);
            const { trigger, dialog, newEmailField } = openDialogFromTrigger();
            await vi.waitFor(() =>
                expect(document.activeElement).toBe(newEmailField)
            );
            expect(dialog.contains(document.activeElement)).toBe(true);

            fillAndSubmit(NEW_EMAIL, "current-secret");

            await vi.waitFor(() =>
                expect(screen.queryByRole("alertdialog")).toBeNull()
            );
            await vi.waitFor(() =>
                expect(document.activeElement).toBe(trigger)
            );
        });
    });

    it("desabilita o botão enquanto a conta não carregou", () => {
        renderForm(undefined);

        const button = screen.getByRole("button", {
            name: emailChangeCopy.action,
        }) as HTMLButtonElement;

        expect(button.disabled).toBe(true);
    });
});
