import { globalTranslations } from "@repo/internationalization/translations/global";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { availabilityMock, requestMock, errorAlertMock } = vi.hoisted(() => ({
    availabilityMock: vi.fn(),
    requestMock: vi.fn(),
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
        authApi: {
            emailLinkSignInAvailability: () => availabilityMock(),
            requestEmailLinkSignIn: (body: unknown) => requestMock(body),
        },
    },
}));

const { EmailLinkRequestForm } = await import(
    "@/app/[locale]/(unauthenticated)/sign-in/email-link/components/EmailLinkRequestForm"
);

const emailLinkCopy =
    globalTranslations["pt-br"].apps.app.pages.emailLinkSignIn;
const apiErrorsCopy = globalTranslations["pt-br"].packages.utils.apiErrors;
const EMAIL = "qa-magic-link@example.com";
const REMEMBERED_EMAIL_KEY = "email-link-sign-in:email";
const NOT_FOUND = 404;

function apiError(status: number, code: string): AxiosError {
    const headers = new AxiosHeaders();
    const config = { headers };
    return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, {}, {
        status,
        statusText: "Error",
        headers,
        config,
        data: { error: { code } },
    } as never);
}

function renderForm() {
    const queryClient = new QueryClient({
        defaultOptions: {
            mutations: { retry: false },
            queries: { retry: false },
        },
    });
    render(
        <QueryClientProvider client={queryClient}>
            <EmailLinkRequestForm />
        </QueryClientProvider>
    );
}

async function typeEmail(value: string) {
    const input = await waitFor(() => {
        const field = document.querySelector<HTMLInputElement>(
            'input[name="email"]'
        );
        if (!field) {
            throw new Error("the email field was not rendered");
        }
        return field;
    });
    fireEvent.change(input, { target: { value } });
    return input;
}

const submitButton = () =>
    screen.getByRole("button", { name: emailLinkCopy.request.form.submit });

beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    availabilityMock.mockResolvedValue({ enabled: true });
    requestMock.mockResolvedValue({ requested: true });
});

afterEach(cleanup);

describe("EmailLinkRequestForm", () => {
    it("shows the unavailable card when the API says the feature is off", async () => {
        availabilityMock.mockResolvedValue({ enabled: false });

        renderForm();

        expect(
            await screen.findByText(emailLinkCopy.request.unavailable.title)
        ).toBeTruthy();
        expect(document.querySelector('input[name="email"]')).toBeNull();
        const back = screen.getByRole("link", {
            name: emailLinkCopy.backToSignIn,
        });
        expect(back.getAttribute("href")).toBe("/pt-br/sign-in");
    });

    it("shows the unavailable card when the availability read fails", async () => {
        availabilityMock.mockRejectedValue(new Error("api down"));

        renderForm();

        expect(
            await screen.findByText(emailLinkCopy.request.unavailable.title)
        ).toBeTruthy();
    });

    it("refuses an invalid address without calling the API", async () => {
        renderForm();
        const input = await typeEmail("not-an-email");

        await act(() => {
            fireEvent.submit(input.form as HTMLFormElement);
        });

        expect(
            await screen.findByText(emailLinkCopy.validation.emailInvalid)
        ).toBeTruthy();
        expect(requestMock).not.toHaveBeenCalled();
    });

    it("sends the address in the screen language, remembers it and shows the sent panel", async () => {
        renderForm();
        await typeEmail(`  ${EMAIL}  `);

        await act(() => {
            fireEvent.click(submitButton());
        });

        expect(
            await screen.findByText(emailLinkCopy.request.sent.title)
        ).toBeTruthy();
        expect(requestMock).toHaveBeenCalledWith({
            email: EMAIL,
            locale: "pt-br",
        });
        expect(window.localStorage.getItem(REMEMBERED_EMAIL_KEY)).toBe(EMAIL);
    });

    it("turns an error code into its translated alert and remembers nothing", async () => {
        requestMock.mockRejectedValue(
            apiError(NOT_FOUND, "AUTH_EMAIL_LINK_DISABLED")
        );

        renderForm();
        await typeEmail(EMAIL);
        await act(() => {
            fireEvent.click(submitButton());
        });

        await waitFor(() =>
            expect(errorAlertMock).toHaveBeenCalledWith(
                apiErrorsCopy.AUTH_EMAIL_LINK_DISABLED
            )
        );
        expect(screen.queryByText(emailLinkCopy.request.sent.title)).toBeNull();
        expect(window.localStorage.getItem(REMEMBERED_EMAIL_KEY)).toBeNull();
    });

    it("sends a single request for a burst of submits", async () => {
        requestMock.mockReturnValue(
            new Promise(() => {
                // stays pending
            })
        );

        renderForm();
        const input = await typeEmail(EMAIL);
        const form = input.form as HTMLFormElement;

        await act(() => {
            fireEvent.submit(form);
            fireEvent.submit(form);
            fireEvent.submit(form);
        });
        await waitFor(() => expect(requestMock).toHaveBeenCalled());
        await act(() => {
            fireEvent.submit(form);
        });

        expect(requestMock).toHaveBeenCalledTimes(1);
        expect(submitButton().hasAttribute("disabled")).toBe(true);
    });
});
