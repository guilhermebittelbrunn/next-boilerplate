// @vitest-environment jsdom
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

const { authState, sendContactMock, errorAlertMock } = vi.hoisted(() => ({
    authState: { user: null as { email: string | null } | null },
    sendContactMock: vi.fn(),
    errorAlertMock: vi.fn(),
}));

vi.mock("@repo/auth/provider", () => ({
    default: () => ({ loading: false, user: authState.user }),
}));

vi.mock("@repo/design-system/hooks/useAlert", () => ({
    default: () => ({
        errorAlert: errorAlertMock,
        infoAlert: vi.fn(),
        successAlert: vi.fn(),
        warningAlert: vi.fn(),
    }),
}));

vi.mock("@/shared/lib/client", () => ({
    apiClient: {
        contact: { send: (...args: unknown[]) => sendContactMock(...args) },
    },
}));

vi.mock("next/navigation", () => ({
    useParams: () => ({ locale: "pt-br" }),
    usePathname: () => "/pt-br/contact",
    useRouter: () => ({ push: vi.fn() }),
}));

const { LocaleProvider } = await import("@repo/internationalization/client");
const { ContactFormClient } = await import(
    "@/app/[locale]/contact/components/contact-form-client"
);

const contactCopy = globalTranslations["pt-br"].apps.web.pages.contact;
const ACCOUNT_EMAIL = "qa-contact-support@example.com";
const TYPED_EMAIL = "outro-endereco@example.com";
const SERVICE_UNAVAILABLE_STATUS = 503;

function ContactFormHarness() {
    return (
        <LocaleProvider>
            <ContactFormClient available />
        </LocaleProvider>
    );
}

function renderForm() {
    const queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
    });
    const view = render(
        <QueryClientProvider client={queryClient}>
            <ContactFormHarness />
        </QueryClientProvider>
    );
    const rerender = () =>
        view.rerender(
            <QueryClientProvider client={queryClient}>
                <ContactFormHarness />
            </QueryClientProvider>
        );
    return { rerender };
}

function field(label: string) {
    return screen.getByLabelText(label) as
        | HTMLInputElement
        | HTMLTextAreaElement;
}

function fillAndSubmit() {
    fireEvent.change(field(contactCopy.hero.form.name), {
        target: { value: "Ana Souza" },
    });
    fireEvent.change(field(contactCopy.hero.form.message), {
        target: { value: "Quero falar sobre o plano Enterprise." },
    });
    fireEvent.click(
        screen.getByRole("button", { name: contactCopy.hero.form.cta })
    );
}

function unavailableError(): AxiosError {
    const headers = new AxiosHeaders();
    const config = { headers };
    return new AxiosError("Request failed", "ERR_BAD_RESPONSE", config, {}, {
        status: SERVICE_UNAVAILABLE_STATUS,
        statusText: "Service Unavailable",
        headers,
        config,
        data: { error: { code: "CONTACT_UNAVAILABLE" } },
    } as never);
}

beforeEach(() => {
    vi.clearAllMocks();
    authState.user = null;
    sendContactMock.mockResolvedValue({ sent: true });
});

afterEach(cleanup);

describe("contact form with the shared session", () => {
    it("fills the email with the account's once the session arrives", () => {
        const { rerender } = renderForm();
        expect(field(contactCopy.hero.form.email).value).toBe("");

        authState.user = { email: ACCOUNT_EMAIL };
        rerender();

        expect(field(contactCopy.hero.form.email).value).toBe(ACCOUNT_EMAIL);
    });

    it("keeps what the person already typed", () => {
        const { rerender } = renderForm();
        fireEvent.change(field(contactCopy.hero.form.email), {
            target: { value: TYPED_EMAIL },
        });

        authState.user = { email: ACCOUNT_EMAIL };
        rerender();

        expect(field(contactCopy.hero.form.email).value).toBe(TYPED_EMAIL);
    });
});

describe("contact form submission", () => {
    it("shows one message per empty field and sends nothing", async () => {
        renderForm();

        fireEvent.click(
            screen.getByRole("button", { name: contactCopy.hero.form.cta })
        );

        expect(
            await screen.findByText(contactCopy.validation.nameRequired)
        ).toBeTruthy();
        expect(
            screen.getByText(contactCopy.validation.emailInvalid)
        ).toBeTruthy();
        expect(
            screen.getByText(contactCopy.validation.messageRequired)
        ).toBeTruthy();
        expect(sendContactMock).not.toHaveBeenCalled();
    });

    it("swaps the form for the confirmation once the API accepts", async () => {
        authState.user = { email: ACCOUNT_EMAIL };
        renderForm();

        fillAndSubmit();

        expect(await screen.findByRole("status")).toBeTruthy();
        expect(screen.getByText(contactCopy.hero.sent.title)).toBeTruthy();
        expect(screen.queryByRole("textbox")).toBeNull();
        expect(sendContactMock).toHaveBeenCalledWith({
            name: "Ana Souza",
            email: ACCOUNT_EMAIL,
            message: "Quero falar sobre o plano Enterprise.",
            locale: "pt-br",
        });
    });

    it("keeps every field filled when the API refuses", async () => {
        authState.user = { email: ACCOUNT_EMAIL };
        sendContactMock.mockRejectedValue(unavailableError());
        renderForm();

        fillAndSubmit();

        await waitFor(() =>
            expect(errorAlertMock).toHaveBeenCalledWith(
                globalTranslations["pt-br"].packages.utils.apiErrors
                    .CONTACT_UNAVAILABLE
            )
        );
        expect(screen.queryByRole("status")).toBeNull();
        expect(field(contactCopy.hero.form.name).value).toBe("Ana Souza");
        expect(field(contactCopy.hero.form.email).value).toBe(ACCOUNT_EMAIL);
        expect(field(contactCopy.hero.form.message).value).toBe(
            "Quero falar sobre o plano Enterprise."
        );
    });

    it("sends once when submit is pressed twice while pending", async () => {
        let resolveSend: ((value: { sent: true }) => void) | undefined;
        sendContactMock.mockReturnValue(
            new Promise((resolve) => {
                resolveSend = resolve;
            })
        );
        authState.user = { email: ACCOUNT_EMAIL };
        renderForm();

        fillAndSubmit();
        await waitFor(() => expect(sendContactMock).toHaveBeenCalledTimes(1));
        const submit = screen.getByRole("button", {
            name: contactCopy.hero.form.cta,
        }) as HTMLButtonElement;
        await waitFor(() => expect(submit.disabled).toBe(true));
        fireEvent.submit(submit.closest("form") as HTMLFormElement);
        await act(async () => {
            await Promise.resolve();
        });

        expect(sendContactMock).toHaveBeenCalledTimes(1);

        await act(async () => {
            resolveSend?.({ sent: true });
            await Promise.resolve();
        });
        expect(await screen.findByRole("status")).toBeTruthy();
    });

    it("sends once when the form is submitted twice in the same task", async () => {
        sendContactMock.mockReturnValue(new Promise(vi.fn()));
        authState.user = { email: ACCOUNT_EMAIL };
        renderForm();
        fireEvent.change(field(contactCopy.hero.form.name), {
            target: { value: "Ana Souza" },
        });
        fireEvent.change(field(contactCopy.hero.form.message), {
            target: { value: "Quero falar sobre o plano Enterprise." },
        });
        const form = screen
            .getByRole("button", { name: contactCopy.hero.form.cta })
            .closest("form") as HTMLFormElement;

        fireEvent.submit(form);
        fireEvent.submit(form);
        await waitFor(() => expect(sendContactMock).toHaveBeenCalled());
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        expect(sendContactMock).toHaveBeenCalledTimes(1);
    });

    it("lets the person send again after the API refuses", async () => {
        authState.user = { email: ACCOUNT_EMAIL };
        sendContactMock.mockRejectedValueOnce(unavailableError());
        renderForm();

        fillAndSubmit();
        await waitFor(() => expect(errorAlertMock).toHaveBeenCalledTimes(1));
        fireEvent.click(
            screen.getByRole("button", { name: contactCopy.hero.form.cta })
        );

        expect(await screen.findByRole("status")).toBeTruthy();
        expect(sendContactMock).toHaveBeenCalledTimes(2);
    });
});
