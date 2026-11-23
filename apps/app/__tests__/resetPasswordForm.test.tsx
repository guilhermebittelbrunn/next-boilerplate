import { globalTranslations } from "@repo/internationalization/translations/global";
import { PASSWORD_MIN_LENGTH } from "@repo/shared/utils/helpers/passwordPolicy";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { confirmPasswordResetMock, errorAlertMock } = vi.hoisted(() => ({
    confirmPasswordResetMock: vi.fn(),
    errorAlertMock: vi.fn(),
}));

vi.mock("@repo/design-system/hooks/useAlert", () => ({
    default: () => ({
        errorAlert: errorAlertMock,
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
        authApi: { confirmPasswordReset: confirmPasswordResetMock },
    },
}));

const { LocaleProvider } = await import("@repo/internationalization/client");
const { ResetPasswordForm } = await import(
    "@/app/[locale]/(unauthenticated)/reset-password/components/ResetPasswordForm"
);

const resetCopy = globalTranslations["pt-br"].apps.app.pages.resetPassword;
const apiErrorCopy = globalTranslations["pt-br"].packages.utils.apiErrors;
const NEW_PASSWORD = "n".repeat(PASSWORD_MIN_LENGTH);
const INTERNAL_SERVER_ERROR = 500;
const BAD_REQUEST = 400;

function apiError(code: string, status: number): AxiosError {
    const headers = new AxiosHeaders();
    const config = { headers };
    return new AxiosError(
        "Request failed",
        "ERR_BAD_RESPONSE",
        config,
        {},
        {
            status,
            statusText: "",
            headers,
            config,
            data: { error: { code } },
        }
    );
}

function renderForm() {
    const queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
    });
    render(
        <QueryClientProvider client={queryClient}>
            <LocaleProvider>
                <ResetPasswordForm oobCode="code-1" />
            </LocaleProvider>
        </QueryClientProvider>
    );
}

function submitNewPassword() {
    for (const name of ["password", "confirmPassword"]) {
        const input = document.querySelector<HTMLInputElement>(
            `input[name="${name}"]`
        );
        if (!input) {
            throw new Error(`the ${name} field was not rendered`);
        }
        fireEvent.change(input, { target: { value: NEW_PASSWORD } });
    }
    const form = document.querySelector("form");
    if (!form) {
        throw new Error("the form was not rendered");
    }
    fireEvent.submit(form);
}

beforeEach(() => {
    vi.clearAllMocks();
});

afterEach(cleanup);

describe("ResetPasswordForm", () => {
    it("shows the saved password and no form when only ending the sessions failed", async () => {
        confirmPasswordResetMock.mockRejectedValue(
            apiError("AUTH_SESSIONS_NOT_REVOKED", INTERNAL_SERVER_ERROR)
        );
        renderForm();

        submitNewPassword();

        await waitFor(() =>
            expect(screen.getByText(resetCopy.success.title)).toBeTruthy()
        );
        expect(
            screen.getByText(apiErrorCopy.AUTH_SESSIONS_NOT_REVOKED)
        ).toBeTruthy();
        expect(document.querySelector("form")).toBeNull();
        const link = screen.getByRole("link", {
            name: resetCopy.goToSignIn,
        }) as HTMLAnchorElement;
        expect(link.getAttribute("href")).toBe("/pt-br/sign-in");
        expect(errorAlertMock).not.toHaveBeenCalled();
    });

    it("keeps the form and alerts on any other error", async () => {
        confirmPasswordResetMock.mockRejectedValue(
            apiError("AUTH_OOB_CODE_INVALID", BAD_REQUEST)
        );
        renderForm();

        submitNewPassword();

        await waitFor(() => expect(errorAlertMock).toHaveBeenCalledTimes(1));
        expect(document.querySelector("form")).not.toBeNull();
        expect(screen.queryByText(resetCopy.success.title)).toBeNull();
    });
});
