import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
    panelMock,
    signOutMutateMock,
    changePasswordMutateMock,
    revokeSessionsMutateMock,
} = vi.hoisted(() => ({
    panelMock: vi.fn(),
    signOutMutateMock: vi.fn(),
    changePasswordMutateMock: vi.fn(),
    revokeSessionsMutateMock: vi.fn(),
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
        render(<AccountSecurityForm />);

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
        render(<AccountSecurityForm />);
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
        render(<AccountSecurityForm />);
        openConfirmationDialog();

        fireEvent.click(
            screen.getByRole("button", { name: accountSecurity.cancel })
        );

        expect(revokeSessionsMutateMock).not.toHaveBeenCalled();
        expect(screen.queryByRole("alertdialog")).toBeNull();
    });

    it("não aninha um botão dentro de outro nos controles do diálogo", () => {
        const { container } = render(<AccountSecurityForm />);
        openConfirmationDialog();

        expect(
            container.ownerDocument.querySelectorAll("button button").length
        ).toBe(0);
    });

    it("bloqueia as duas ações durante uma personificação", () => {
        panelMock.mockReturnValue({ isImpersonating: true });
        render(<AccountSecurityForm />);

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
        const { container } = render(<AccountSecurityForm />);
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
        const { container } = render(<AccountSecurityForm />);
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
