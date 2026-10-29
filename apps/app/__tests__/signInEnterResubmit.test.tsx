import { globalTranslations } from "@repo/internationalization/translations/global";
import { EXISTING_PASSWORD_MIN_LENGTH } from "@repo/shared/utils/helpers/passwordPolicy";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { signInFnMock } = vi.hoisted(() => ({ signInFnMock: vi.fn() }));

vi.mock("@repo/auth/provider", async () => {
    const { useMutation } = await import("@tanstack/react-query");
    const { createContext, createElement, useContext } = await import("react");
    const SignInContext = createContext<unknown>(null);

    function SignInMutationProvider({ children }: { children: ReactNode }) {
        const signIn = useMutation({
            mutationFn: (credentials: unknown) => signInFnMock(credentials),
        });
        return createElement(
            SignInContext.Provider,
            { value: signIn },
            children
        );
    }

    return {
        AuthTestProvider: SignInMutationProvider,
        default: () => ({
            loading: false,
            user: null,
            signIn: useContext(SignInContext),
        }),
    };
});

vi.mock("@repo/design-system/hooks/useAlert", () => ({
    default: () => ({
        errorAlert: vi.fn(),
        infoAlert: vi.fn(),
        successAlert: vi.fn(),
        warningAlert: vi.fn(),
    }),
}));

vi.mock("next/navigation", () => ({
    useParams: () => ({ locale: "pt-br" }),
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/shared/lib/client", () => ({
    apiClient: { setAuthorizationHeader: vi.fn() },
}));

vi.mock("@/shared/lib/googleSignInApi", () => ({
    signInWithGoogleViaApi: vi.fn(),
}));

vi.mock("@/shared/lib/postLoginNavigation", () => ({
    resolveAppPostLoginPath: vi.fn(),
}));

const { AuthTestProvider } = (await import(
    "@repo/auth/provider"
)) as unknown as {
    AuthTestProvider: (props: { children: ReactNode }) => ReactNode;
};
const { LocaleProvider } = await import("@repo/internationalization/client");
const { SignInForm } = await import(
    "@/app/[locale]/(unauthenticated)/sign-in/components/SignInForm"
);

const EMAIL = "qa-sign-in-enter@example.com";
const WRONG_PASSWORD = "b".repeat(EXISTING_PASSWORD_MIN_LENGTH);
const MICROTASK_ROUNDS = 20;
const pendingSignIns: ((value: unknown) => void)[] = [];

function renderForm(redirect?: string) {
    const queryClient = new QueryClient({
        defaultOptions: {
            mutations: { retry: false },
            queries: { retry: false },
        },
    });
    render(
        <QueryClientProvider client={queryClient}>
            <AuthTestProvider>
                <LocaleProvider>
                    <SignInForm redirect={redirect} />
                </LocaleProvider>
            </AuthTestProvider>
        </QueryClientProvider>
    );
}

function inputNamed(name: string): HTMLInputElement {
    const input = document.querySelector<HTMLInputElement>(
        `input[name="${name}"]`
    );
    if (!input) {
        throw new Error(`the ${name} field was not rendered`);
    }
    return input;
}

function defaultButtonOf(form: HTMLFormElement): HTMLButtonElement {
    const button = form.querySelector<HTMLButtonElement>(
        'button[type="submit"]'
    );
    if (!button) {
        throw new Error("the sign-in form has no submit button");
    }
    return button;
}

function pressEnterLikeTheBrowser(input: HTMLInputElement) {
    const notCancelled = fireEvent.keyDown(input, { key: "Enter" });
    const form = input.form;
    if (notCancelled && form && !defaultButtonOf(form).disabled) {
        fireEvent.submit(form);
    }
}

async function pressEnterAndSettle(input: HTMLInputElement) {
    await act(async () => {
        pressEnterLikeTheBrowser(input);
        for (let round = 0; round < MICROTASK_ROUNDS; round++) {
            await Promise.resolve();
        }
    });
}

beforeEach(() => {
    vi.clearAllMocks();
    signInFnMock.mockImplementation(
        () =>
            new Promise((settle) => {
                pendingSignIns.push(settle);
            })
    );
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

describe("login da app enviado com Enter", () => {
    it("manda um único pedido quando o segundo Enter chega antes de o botão travar", async () => {
        renderForm();
        fireEvent.change(inputNamed("email"), { target: { value: EMAIL } });
        fireEvent.change(inputNamed("password"), {
            target: { value: WRONG_PASSWORD },
        });
        const password = inputNamed("password");
        password.focus();

        await pressEnterAndSettle(password);
        expect(signInFnMock).toHaveBeenCalledTimes(1);
        expect(defaultButtonOf(password.form as HTMLFormElement).disabled).toBe(
            false
        );

        await pressEnterAndSettle(password);
        await pressEnterAndSettle(inputNamed("email"));
        expect(signInFnMock).toHaveBeenCalledTimes(1);

        act(() => {
            vi.advanceTimersByTime(0);
        });
        expect(defaultButtonOf(password.form as HTMLFormElement).disabled).toBe(
            true
        );
        expect(document.activeElement).toBe(password);
    });
});

describe("validação do formulário de login", () => {
    it("fica com o zod em vez do balão nativo do navegador", () => {
        renderForm();

        expect(inputNamed("email").form?.noValidate).toBe(true);
    });
});

describe("link para o cadastro", () => {
    it("leva junto o destino que o login recebeu", () => {
        renderForm("/pt-br/account?tab=billing&plan=price_1");

        const signUpLink = screen.getByRole("link", {
            name: globalTranslations["pt-br"].apps.app.pages.signIn.signUp,
        });
        expect(signUpLink.getAttribute("href")).toBe(
            "/pt-br/sign-up?redirect=%2Fpt-br%2Faccount%3Ftab%3Dbilling%26plan%3Dprice_1"
        );
    });
});
