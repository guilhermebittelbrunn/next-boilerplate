import { globalTranslations } from "@repo/internationalization/translations/global";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { availabilityMock } = vi.hoisted(() => ({
    availabilityMock: vi.fn(),
}));

vi.mock("@repo/auth/provider", () => ({
    default: () => ({
        loading: false,
        signIn: { isPending: false, mutate: vi.fn() },
        user: null,
    }),
}));

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
    apiClient: {
        setAuthorizationHeader: vi.fn(),
        authApi: {
            emailLinkSignInAvailability: () => availabilityMock(),
        },
    },
}));

vi.mock("@/shared/lib/googleSignInApi", () => ({
    signInWithGoogleViaApi: vi.fn(),
}));

vi.mock("@/shared/lib/postLoginNavigation", () => ({
    resolveAppPostLoginPath: vi.fn(),
}));

const { SignInForm } = await import(
    "@/app/[locale]/(unauthenticated)/sign-in/components/SignInForm"
);

const signInCopy = globalTranslations["pt-br"].apps.app.pages.signIn;

function renderSignIn() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    render(
        <QueryClientProvider client={queryClient}>
            <SignInForm />
        </QueryClientProvider>
    );
}

const emailLinkEntry = () =>
    screen.queryByRole("link", { name: signInCopy.emailLink });

beforeEach(() => {
    availabilityMock.mockReset();
});

afterEach(cleanup);

describe("entrada do login por link na tela de login", () => {
    it("aparece e leva à página do link quando a API diz que está disponível", async () => {
        availabilityMock.mockResolvedValue({ enabled: true });

        renderSignIn();

        const link = await screen.findByRole("link", {
            name: signInCopy.emailLink,
        });
        expect(link.getAttribute("href")).toBe("/pt-br/sign-in/email-link");
    });

    it("não aparece quando a API diz que está desligado", async () => {
        availabilityMock.mockResolvedValue({ enabled: false });

        renderSignIn();

        await waitFor(() => expect(availabilityMock).toHaveBeenCalled());
        await screen.findByRole("link", { name: signInCopy.forgotPassword });
        expect(emailLinkEntry()).toBeNull();
    });

    it("não aparece quando a consulta falha", async () => {
        availabilityMock.mockRejectedValue(new Error("api down"));

        renderSignIn();

        await waitFor(() => expect(availabilityMock).toHaveBeenCalled());
        await new Promise((settle) => setTimeout(settle, 0));
        expect(emailLinkEntry()).toBeNull();
    });

    it("não aparece enquanto a consulta carrega, e o formulário de senha já está na tela", () => {
        availabilityMock.mockReturnValue(
            new Promise(() => {
                // never settles
            })
        );

        renderSignIn();

        expect(emailLinkEntry()).toBeNull();
        expect(document.querySelector('input[name="password"]')).not.toBeNull();
    });
});
