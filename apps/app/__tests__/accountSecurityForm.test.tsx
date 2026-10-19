import type { AccountDTO } from "@repo/sdk/src/types";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
    panelMock,
    signOutMutateMock,
    changePasswordMutateMock,
    revokeSessionsMutateMock,
    setPasswordMutateMock,
} = vi.hoisted(() => ({
    panelMock: vi.fn(),
    signOutMutateMock: vi.fn(),
    changePasswordMutateMock: vi.fn(),
    revokeSessionsMutateMock: vi.fn(),
    setPasswordMutateMock: vi.fn(),
}));

vi.mock("@/shared/providers/AuthRequestPanelContext", () => ({
    useAuthRequestPanel: () => panelMock(),
}));

vi.mock("@repo/auth/provider", () => ({
    default: () => ({ signOut: { mutate: signOutMutateMock } }),
}));

vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(hooks)/useAccountMutations",
    () => ({
        useAccountMutations: () => ({
            changePasswordMutation: {
                mutate: changePasswordMutateMock,
                isPending: false,
            },
            revokeSessionsMutation: {
                mutate: revokeSessionsMutateMock,
                isPending: false,
            },
        }),
    })
);

vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(hooks)/useSignInMethodMutations",
    () => ({
        useSignInMethodMutations: () => ({
            setPasswordMutation: {
                mutate: setPasswordMutateMock,
                isPending: false,
            },
            linkGoogleMutation: { mutate: vi.fn(), isPending: false },
            unlinkMutation: {
                mutate: vi.fn(),
                isPending: false,
                variables: undefined,
            },
        }),
    })
);

vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountSessionsPanel",
    () => ({ AccountSessionsPanel: () => null })
);

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
    useParams: () => ({ locale: "pt-br" }),
}));

const { AccountSecurityForm } = await import(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountSecurityForm"
);
const { globalTranslations } = await import(
    "@repo/internationalization/translations/global"
);

const accountSecurity =
    globalTranslations["pt-br"].apps.app.pages.common.account.security;

function accountWith(...providerIds: string[]): AccountDTO {
    return {
        providerData: providerIds.map((providerId) => ({
            providerId,
            uid: `${providerId}-uid`,
            displayName: null,
            email: "owner@example.com",
            phoneNumber: null,
        })),
    } as unknown as AccountDTO;
}

const PASSWORD_ACCOUNT = accountWith("password");
const SETTLE_DELAY_MS = 20;
const GOOGLE_ONLY_ACCOUNT = accountWith("google.com");

function openConfirmationDialog() {
    const trigger = screen
        .getAllByRole("button", { name: accountSecurity.signOutEverywhere })
        .at(-1);
    if (!trigger) {
        throw new Error("o botão que abre o diálogo não foi renderizado");
    }
    fireEvent.click(trigger);
}

beforeEach(() => {
    vi.clearAllMocks();
    panelMock.mockReturnValue({ isImpersonating: false });
});

afterEach(cleanup);

describe("AccountSecurityForm — sair de todos os dispositivos", () => {
    it("só encerra as sessões depois da confirmação no diálogo", () => {
        render(<AccountSecurityForm account={PASSWORD_ACCOUNT} />);

        expect(revokeSessionsMutateMock).not.toHaveBeenCalled();

        openConfirmationDialog();

        expect(screen.getByRole("alertdialog")).toBeTruthy();
        expect(revokeSessionsMutateMock).not.toHaveBeenCalled();

        fireEvent.click(
            screen.getByRole("button", {
                name: accountSecurity.signOutEverywhereAction,
            })
        );

        expect(revokeSessionsMutateMock).toHaveBeenCalledTimes(1);
    });

    it("desloga o navegador atual quando o encerramento das sessões confirma", () => {
        render(<AccountSecurityForm account={PASSWORD_ACCOUNT} />);
        openConfirmationDialog();
        fireEvent.click(
            screen.getByRole("button", {
                name: accountSecurity.signOutEverywhereAction,
            })
        );

        const [, options] = revokeSessionsMutateMock.mock.calls[0] as [
            unknown,
            { onSuccess: () => void },
        ];
        options.onSuccess();

        expect(signOutMutateMock).toHaveBeenCalledTimes(1);
    });

    it("não dispara requisição quando o diálogo é cancelado", () => {
        render(<AccountSecurityForm account={PASSWORD_ACCOUNT} />);
        openConfirmationDialog();

        fireEvent.click(
            screen.getByRole("button", { name: accountSecurity.cancel })
        );

        expect(revokeSessionsMutateMock).not.toHaveBeenCalled();
        expect(screen.queryByRole("alertdialog")).toBeNull();
    });

    it("não aninha um botão dentro de outro nos controles do diálogo", () => {
        const { container } = render(
            <AccountSecurityForm account={PASSWORD_ACCOUNT} />
        );
        openConfirmationDialog();

        expect(
            container.ownerDocument.querySelectorAll("button button").length
        ).toBe(0);
    });

    it("bloqueia as duas ações durante uma personificação", () => {
        panelMock.mockReturnValue({ isImpersonating: true });
        render(<AccountSecurityForm account={PASSWORD_ACCOUNT} />);

        const save = screen.getByRole("button", {
            name: accountSecurity.save,
        }) as HTMLButtonElement;
        const trigger = screen
            .getAllByRole("button", { name: accountSecurity.signOutEverywhere })
            .at(-1) as HTMLButtonElement;

        expect(save.disabled).toBe(true);
        expect(trigger.disabled).toBe(true);
    });
});

describe("AccountSecurityForm — troca de senha", () => {
    function fillPasswords(
        container: HTMLElement,
        values: Record<string, string>
    ) {
        for (const [name, value] of Object.entries(values)) {
            const field = container.querySelector(`input[name="${name}"]`);
            if (!field) {
                throw new Error(`o campo ${name} não foi renderizado`);
            }
            fireEvent.change(field, { target: { value } });
        }
    }

    it("não envia a troca quando a confirmação não bate", async () => {
        const { container } = render(
            <AccountSecurityForm account={PASSWORD_ACCOUNT} />
        );
        fillPasswords(container, {
            currentPassword: "current-secret",
            password: "brand-new-secret",
            confirmPassword: "another-secret",
        });

        fireEvent.click(
            screen.getByRole("button", { name: accountSecurity.save })
        );
        await screen.findByText(accountSecurity.validation.mismatch);

        expect(changePasswordMutateMock).not.toHaveBeenCalled();
    });

    it("envia apenas a senha atual e a nova, nunca a confirmação", async () => {
        const { container } = render(
            <AccountSecurityForm account={PASSWORD_ACCOUNT} />
        );
        fillPasswords(container, {
            currentPassword: "current-secret",
            password: "brand-new-secret",
            confirmPassword: "brand-new-secret",
        });

        fireEvent.click(
            screen.getByRole("button", { name: accountSecurity.save })
        );
        await vi.waitFor(() =>
            expect(changePasswordMutateMock).toHaveBeenCalledTimes(1)
        );

        expect(changePasswordMutateMock.mock.calls[0]?.[0]).toEqual({
            currentPassword: "current-secret",
            password: "brand-new-secret",
        });
    });
});

describe("AccountSecurityForm — conta sem senha", () => {
    function fillPasswords(
        container: HTMLElement,
        values: Record<string, string>
    ) {
        for (const [name, value] of Object.entries(values)) {
            const field = container.querySelector(`input[name="${name}"]`);
            if (!field) {
                throw new Error(`o campo ${name} não foi renderizado`);
            }
            fireEvent.change(field, { target: { value } });
        }
    }

    it("mostra o formulário de definir senha e esconde o de troca", () => {
        const { container } = render(
            <AccountSecurityForm account={GOOGLE_ONLY_ACCOUNT} />
        );

        expect(
            screen.getByRole("button", {
                name: accountSecurity.setPassword.save,
            })
        ).toBeTruthy();
        expect(
            screen.queryByRole("button", { name: accountSecurity.save })
        ).toBeNull();
        expect(
            container.querySelector('input[name="currentPassword"]')
        ).toBeNull();
    });

    it("com senha, mostra só o formulário de troca", () => {
        render(
            <AccountSecurityForm
                account={accountWith("password", "google.com")}
            />
        );

        expect(
            screen.getByRole("button", { name: accountSecurity.save })
        ).toBeTruthy();
        expect(
            screen.queryByRole("button", {
                name: accountSecurity.setPassword.save,
            })
        ).toBeNull();
    });

    it("não abre o popup com a senha curta", async () => {
        const { container } = render(
            <AccountSecurityForm account={GOOGLE_ONLY_ACCOUNT} />
        );
        fillPasswords(container, {
            password: "short",
            confirmPassword: "short",
        });

        fireEvent.click(
            screen.getByRole("button", {
                name: accountSecurity.setPassword.save,
            })
        );
        await screen.findByText(accountSecurity.validation.newPasswordMin);

        expect(setPasswordMutateMock).not.toHaveBeenCalled();
    });

    it("não abre o popup quando a confirmação não bate", async () => {
        const { container } = render(
            <AccountSecurityForm account={GOOGLE_ONLY_ACCOUNT} />
        );
        fillPasswords(container, {
            password: "brand-new-secret",
            confirmPassword: "another-secret",
        });

        fireEvent.click(
            screen.getByRole("button", {
                name: accountSecurity.setPassword.save,
            })
        );
        await screen.findByText(accountSecurity.validation.mismatch);

        expect(setPasswordMutateMock).not.toHaveBeenCalled();
    });

    it("envia só a senha nova e sai depois do sucesso", async () => {
        const { container } = render(
            <AccountSecurityForm account={GOOGLE_ONLY_ACCOUNT} />
        );
        fillPasswords(container, {
            password: "brand-new-secret",
            confirmPassword: "brand-new-secret",
        });

        fireEvent.click(
            screen.getByRole("button", {
                name: accountSecurity.setPassword.save,
            })
        );
        await vi.waitFor(() =>
            expect(setPasswordMutateMock).toHaveBeenCalledTimes(1)
        );

        const [password, options] = setPasswordMutateMock.mock.calls[0] as [
            string,
            { onSuccess: () => void },
        ];
        expect(password).toBe("brand-new-secret");
        options.onSuccess();
        expect(signOutMutateMock).toHaveBeenCalledTimes(1);
    });

    it("um segundo envio antes de a primeira tentativa terminar não abre outro popup", async () => {
        const { container } = render(
            <AccountSecurityForm account={GOOGLE_ONLY_ACCOUNT} />
        );
        fillPasswords(container, {
            password: "brand-new-secret",
            confirmPassword: "brand-new-secret",
        });
        const save = screen.getByRole("button", {
            name: accountSecurity.setPassword.save,
        });

        fireEvent.click(save);
        await vi.waitFor(() =>
            expect(setPasswordMutateMock).toHaveBeenCalledTimes(1)
        );
        fireEvent.click(save);
        await new Promise((resolve) => setTimeout(resolve, SETTLE_DELAY_MS));

        expect(setPasswordMutateMock).toHaveBeenCalledTimes(1);
    });

    it("bloqueia a definição de senha durante uma personificação", () => {
        panelMock.mockReturnValue({ isImpersonating: true });
        render(<AccountSecurityForm account={GOOGLE_ONLY_ACCOUNT} />);

        const save = screen.getByRole("button", {
            name: accountSecurity.setPassword.save,
        }) as HTMLButtonElement;

        expect(save.disabled).toBe(true);
    });
});
