import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

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
        authApi: {
            confirmPasswordReset: vi.fn(),
            requestPasswordReset: vi.fn(),
        },
    },
}));

const { ForgotPasswordForm } = await import(
    "@/app/[locale]/(unauthenticated)/forgot-password/components/ForgotPasswordForm"
);
const { ResetPasswordForm } = await import(
    "@/app/[locale]/(unauthenticated)/reset-password/components/ResetPasswordForm"
);

function renderedForm(ui: ReactElement): HTMLFormElement {
    const queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
    });
    const { container } = render(
        <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    );
    const form = container.querySelector("form");
    if (!form) {
        throw new Error("the form was not rendered");
    }
    return form;
}

afterEach(cleanup);

describe("formulários de senha validados só pelo zod", () => {
    it("desliga a validação nativa no pedido de redefinição", () => {
        expect(renderedForm(<ForgotPasswordForm />).noValidate).toBe(true);
    });

    it("desliga a validação nativa na nova senha", () => {
        expect(
            renderedForm(<ResetPasswordForm oobCode="qa-code" />).noValidate
        ).toBe(true);
    });
});
