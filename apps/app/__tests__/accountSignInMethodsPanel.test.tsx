import type { AccountDTO } from "@repo/sdk/src/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
    panelMock,
    linkGoogleMock,
    reloadCurrentUserMock,
    confirmLinkedMock,
    unlinkMock,
    successAlertMock,
    errorAlertMock,
    signOutMutateMock,
} = vi.hoisted(() => ({
    panelMock: vi.fn(),
    linkGoogleMock: vi.fn(),
    reloadCurrentUserMock: vi.fn(),
    confirmLinkedMock: vi.fn(),
    unlinkMock: vi.fn(),
    successAlertMock: vi.fn(),
    errorAlertMock: vi.fn(),
    signOutMutateMock: vi.fn(),
}));

vi.mock("@/shared/providers/AuthRequestPanelContext", () => ({
    useAuthRequestPanel: () => panelMock(),
}));

vi.mock("@repo/auth/provider", () => ({
    default: () => ({ signOut: { mutate: signOutMutateMock } }),
}));

vi.mock("@repo/auth/client", () => ({
    linkGoogle: (...args: unknown[]) => linkGoogleMock(...args),
    reauthenticateWithGoogle: vi.fn(),
    reloadCurrentUser: (...args: unknown[]) => reloadCurrentUserMock(...args),
}));

vi.mock("@/shared/lib/client", () => ({
    apiClient: {
        account: {
            confirmSignInMethodLinked: (...args: unknown[]) =>
                confirmLinkedMock(...args),
            unlinkSignInMethod: (...args: unknown[]) => unlinkMock(...args),
            setPassword: vi.fn(),
        },
    },
}));

vi.mock("@repo/design-system/hooks/useAlert", () => ({
    default: () => ({
        errorAlert: errorAlertMock,
        successAlert: successAlertMock,
    }),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
    useParams: () => ({ locale: "pt-br" }),
}));

const { AccountSignInMethodsPanel } = await import(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountSignInMethodsPanel"
);
const { globalTranslations } = await import(
    "@repo/internationalization/translations/global"
);

const accountCopy = globalTranslations["pt-br"].apps.app.pages.common.account;
const methodsCopy = accountCopy.security.signInMethods;
const firebaseErrors =
    globalTranslations["pt-br"].packages.auth.provider.firebase.error;
const GOOGLE_EMAIL = "owner.google@example.com";
const SETTLE_DELAY_MS = 20;

function accountWith(...providerIds: string[]): AccountDTO {
    return {
        providerData: providerIds.map((providerId) => ({
            providerId,
            uid: `${providerId}-uid`,
            displayName: null,
            email: providerId === "google.com" ? GOOGLE_EMAIL : null,
            phoneNumber: null,
        })),
    } as unknown as AccountDTO;
}

function firebaseError(code: string) {
    return Object.assign(new Error(`Firebase: Error (${code}).`), { code });
}

function renderPanel(account: AccountDTO | undefined) {
    const queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
    });
    return render(
        <QueryClientProvider client={queryClient}>
            <AccountSignInMethodsPanel account={account} />
        </QueryClientProvider>
    );
}

const unlinkButton = (methodLabel: string) =>
    screen.getByRole("button", {
        name: methodsCopy.unlinkAriaLabel.replace("{method}", methodLabel),
    }) as HTMLButtonElement;

const linkGoogleButton = () =>
    screen.getByRole("button", {
        name: methodsCopy.linkGoogle,
    }) as HTMLButtonElement;

beforeEach(() => {
    for (const mock of [
        panelMock,
        linkGoogleMock,
        reloadCurrentUserMock,
        confirmLinkedMock,
        unlinkMock,
        successAlertMock,
        errorAlertMock,
        signOutMutateMock,
    ]) {
        mock.mockReset();
    }
    panelMock.mockReturnValue({ isImpersonating: false });
    linkGoogleMock.mockResolvedValue({});
    confirmLinkedMock.mockResolvedValue({ confirmed: true });
    unlinkMock.mockResolvedValue(undefined);
    reloadCurrentUserMock.mockResolvedValue(undefined);
});

afterEach(cleanup);

describe("AccountSignInMethodsPanel — lista", () => {
    it("lista senha e Google com o e-mail da conta Google", () => {
        renderPanel(accountWith("password", "google.com"));

        expect(screen.getByText(methodsCopy.methods.password)).toBeTruthy();
        expect(screen.getByText(methodsCopy.methods.google)).toBeTruthy();
        expect(screen.getAllByText(methodsCopy.linked)).toHaveLength(2);
        expect(screen.getByText(GOOGLE_EMAIL)).toBeTruthy();
        expect(unlinkButton(methodsCopy.methods.password).disabled).toBe(false);
        expect(unlinkButton(methodsCopy.methods.google).disabled).toBe(false);
    });

    it("com um método só, desabilita o desvínculo e explica por quê", () => {
        renderPanel(accountWith("google.com"));

        expect(unlinkButton(methodsCopy.methods.google).disabled).toBe(true);
        expect(screen.getByText(methodsCopy.lastMethodHint)).toBeTruthy();
        expect(screen.getByText(methodsCopy.notLinked)).toBeTruthy();
    });

    it("mostra um provedor desconhecido pelo id cru", () => {
        renderPanel(accountWith("password", "github.com"));

        expect(screen.getByText("github.com")).toBeTruthy();
        expect(unlinkButton("github.com").disabled).toBe(false);
    });

    it("não lista nada enquanto a conta carrega", () => {
        renderPanel(undefined);

        expect(screen.queryByText(methodsCopy.methods.password)).toBeNull();
        expect(screen.queryAllByRole("button")).toHaveLength(0);
    });

    it("desabilita todas as ações durante uma personificação", () => {
        panelMock.mockReturnValue({ isImpersonating: true });
        renderPanel(accountWith("password"));

        expect(linkGoogleButton().disabled).toBe(true);
        expect(unlinkButton(methodsCopy.methods.password).disabled).toBe(true);
    });
});

describe("AccountSignInMethodsPanel — vincular o Google", () => {
    it("vincula pelo popup e depois registra na API", async () => {
        renderPanel(accountWith("password"));

        fireEvent.click(linkGoogleButton());

        await waitFor(() =>
            expect(successAlertMock).toHaveBeenCalledWith(
                accountCopy.messages.signInMethodLinked
            )
        );
        expect(linkGoogleMock).toHaveBeenCalledTimes(1);
        expect(confirmLinkedMock).toHaveBeenCalledWith({
            providerId: "google.com",
        });
        expect(linkGoogleMock.mock.invocationCallOrder[0]).toBeLessThan(
            confirmLinkedMock.mock.invocationCallOrder[0] ?? 0
        );
        expect(errorAlertMock).not.toHaveBeenCalled();
    });

    it.each(["auth/popup-closed-by-user", "auth/cancelled-popup-request"])(
        "fechar o popup (%s) não abre alerta nem chama a API",
        async (code) => {
            linkGoogleMock.mockRejectedValue(firebaseError(code));
            renderPanel(accountWith("password"));

            fireEvent.click(linkGoogleButton());

            await waitFor(() => expect(linkGoogleMock).toHaveBeenCalled());
            await waitFor(() =>
                expect(linkGoogleButton().disabled).toBe(false)
            );
            await new Promise((resolve) =>
                setTimeout(resolve, SETTLE_DELAY_MS)
            );
            expect(linkGoogleMock).toHaveBeenCalledTimes(1);
            expect(confirmLinkedMock).not.toHaveBeenCalled();
            expect(errorAlertMock).not.toHaveBeenCalled();
            expect(successAlertMock).not.toHaveBeenCalled();
        }
    );

    it.each([
        "auth/credential-already-in-use",
        "auth/popup-blocked",
        "auth/unauthorized-domain",
        "auth/operation-not-allowed",
    ] as const)("traduz %s e não registra vínculo", async (code) => {
        linkGoogleMock.mockRejectedValue(firebaseError(code));
        renderPanel(accountWith("password"));

        fireEvent.click(linkGoogleButton());

        await waitFor(() =>
            expect(errorAlertMock).toHaveBeenCalledWith(firebaseErrors[code])
        );
        expect(confirmLinkedMock).not.toHaveBeenCalled();
    });
});

describe("AccountSignInMethodsPanel — desvincular", () => {
    it("só desvincula depois da confirmação, sem consultar o Firebase do navegador", async () => {
        renderPanel(accountWith("password", "google.com"));

        fireEvent.click(unlinkButton(methodsCopy.methods.google));
        expect(
            screen.getByText(methodsCopy.unlinkDialog.googleWarning)
        ).toBeTruthy();
        expect(unlinkMock).not.toHaveBeenCalled();

        fireEvent.click(
            screen.getByRole("button", {
                name: methodsCopy.unlinkDialog.confirm,
            })
        );

        await waitFor(() =>
            expect(successAlertMock).toHaveBeenCalledWith(
                accountCopy.messages.signInMethodUnlinked
            )
        );
        expect(unlinkMock).toHaveBeenCalledWith("google.com");
        expect(reloadCurrentUserMock).not.toHaveBeenCalled();
        expect(signOutMutateMock).not.toHaveBeenCalled();
    });

    it("desvincular a senha encerra a sessão", async () => {
        renderPanel(accountWith("password", "google.com"));

        fireEvent.click(unlinkButton(methodsCopy.methods.password));
        fireEvent.click(
            screen.getByRole("button", {
                name: methodsCopy.unlinkDialog.confirm,
            })
        );

        await waitFor(() => expect(signOutMutateMock).toHaveBeenCalledTimes(1));
        expect(unlinkMock).toHaveBeenCalledWith("password");
        expect(successAlertMock).toHaveBeenCalledWith(
            accountCopy.messages.passwordUnlinked
        );
        expect(reloadCurrentUserMock).not.toHaveBeenCalled();
        expect(errorAlertMock).not.toHaveBeenCalled();
    });

    it("não sai da conta quando a API recusa o desvínculo da senha", async () => {
        unlinkMock.mockRejectedValue(new Error("boom"));
        renderPanel(accountWith("password", "google.com"));

        fireEvent.click(unlinkButton(methodsCopy.methods.password));
        fireEvent.click(
            screen.getByRole("button", {
                name: methodsCopy.unlinkDialog.confirm,
            })
        );

        await waitFor(() => expect(errorAlertMock).toHaveBeenCalled());
        expect(signOutMutateMock).not.toHaveBeenCalled();
    });

    it("o diálogo da senha avisa que e-mail e senha deixam de abrir a conta", () => {
        renderPanel(accountWith("password", "google.com"));

        fireEvent.click(unlinkButton(methodsCopy.methods.password));

        expect(
            screen.getByText(methodsCopy.unlinkDialog.passwordWarning)
        ).toBeTruthy();
    });

    it("cancelar o diálogo não chama a API", () => {
        renderPanel(accountWith("password", "google.com"));

        fireEvent.click(unlinkButton(methodsCopy.methods.google));
        fireEvent.click(
            screen.getByRole("button", {
                name: methodsCopy.unlinkDialog.cancel,
            })
        );

        expect(unlinkMock).not.toHaveBeenCalled();
    });

    it("bloqueia as outras ações enquanto um desvínculo roda", async () => {
        let finishUnlink: (() => void) | undefined;
        unlinkMock.mockReturnValue(
            new Promise<void>((resolve) => {
                finishUnlink = resolve;
            })
        );
        renderPanel(accountWith("password", "google.com"));

        fireEvent.click(unlinkButton(methodsCopy.methods.google));
        fireEvent.click(
            screen.getByRole("button", {
                name: methodsCopy.unlinkDialog.confirm,
            })
        );

        await waitFor(() =>
            expect(unlinkButton(methodsCopy.methods.password).disabled).toBe(
                true
            )
        );
        finishUnlink?.();
        await waitFor(() => expect(successAlertMock).toHaveBeenCalled());
    });
});
