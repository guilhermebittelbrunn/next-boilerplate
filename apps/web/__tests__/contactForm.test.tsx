import { globalTranslations } from "@repo/internationalization/translations/global";
import { type Locale, locales } from "@repo/internationalization/utils";
import { AxiosError, AxiosHeaders } from "axios";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type CapturedMutation = {
    mutationFn: (variables: unknown) => Promise<unknown>;
    onError: (error: unknown) => void;
};

const { mutations, mutationState, sendContactMock, errorAlertMock, params } =
    vi.hoisted(() => ({
        mutations: [] as CapturedMutation[],
        mutationState: { isPending: false, isSuccess: false },
        sendContactMock: vi.fn(),
        errorAlertMock: vi.fn(),
        params: { locale: "pt-br" } as Record<string, string>,
    }));

/**
 * This workspace renders on the server only, so the form is rendered to string and the
 * contact contract is exercised through the mutation options the component registered.
 */
vi.mock("@tanstack/react-query", () => ({
    useMutation: (options: CapturedMutation) => {
        mutations.push(options);
        return { ...mutationState, mutate: vi.fn() };
    },
}));

vi.mock("@repo/auth/provider", () => ({
    default: () => ({ loading: false, user: null }),
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
    useParams: () => params,
    usePathname: () => `/${params.locale}/contact`,
    useRouter: () => ({ push: vi.fn() }),
}));

const { LocaleProvider } = await import("@repo/internationalization/client");
const { ContactFormClient } = await import(
    "@/app/[locale]/contact/components/contact-form-client"
);

const MESSAGE = {
    name: "Ana Souza",
    email: "qa-contact-support@example.com",
    message: "Quero falar sobre o plano Enterprise.",
};
const SERVICE_UNAVAILABLE_STATUS = 503;
const FORM_TAG = /<form\b/;
const SUBMIT_BUTTON_TAG = /<button\b[^>]*type="submit"[^>]*>/;
const DISABLED_ATTRIBUTE = /\sdisabled(=""|\s|>)/;

function renderContactForm(available: boolean, locale: Locale = "pt-br") {
    params.locale = locale;
    return renderToString(
        <LocaleProvider>
            <ContactFormClient available={available} />
        </LocaleProvider>
    );
}

function capturedMutation(): CapturedMutation {
    const [sendMessage] = mutations;
    if (!sendMessage) {
        throw new Error("the form registered no mutation");
    }
    return sendMessage;
}

function apiError(code: string): AxiosError {
    const headers = new AxiosHeaders();
    const config = { headers };
    return new AxiosError("Request failed", "ERR_BAD_RESPONSE", config, {}, {
        status: SERVICE_UNAVAILABLE_STATUS,
        statusText: "Service Unavailable",
        headers,
        config,
        data: { error: { code } },
    } as never);
}

beforeEach(() => {
    vi.clearAllMocks();
    mutations.length = 0;
    mutationState.isPending = false;
    mutationState.isSuccess = false;
    sendContactMock.mockResolvedValue({ sent: true });
});

describe.each(locales)("contact form in %s", (locale) => {
    const contactCopy = globalTranslations[locale].apps.web.pages.contact;

    it("shows the unavailable notice and no form without a support inbox", () => {
        const html = renderContactForm(false, locale);

        expect(html).toContain(contactCopy.hero.unavailable.title);
        expect(html).toContain(contactCopy.hero.unavailable.description);
        expect(html).not.toMatch(FORM_TAG);
    });

    it("asks for name, email and message, and nothing else", () => {
        const html = renderContactForm(true, locale);

        expect(html).toMatch(FORM_TAG);
        expect(html).toContain('name="name"');
        expect(html).toContain('name="email"');
        expect(html).toContain('type="email"');
        expect(html).toContain('name="message"');
        expect(html).toContain(contactCopy.hero.form.name);
        expect(html).toContain(contactCopy.hero.form.email);
        expect(html).toContain(contactCopy.hero.form.message);
        expect(html).not.toContain('type="file"');
        expect(html).not.toContain('id="date"');
        expect(html).toMatch(SUBMIT_BUTTON_TAG);
    });

    it("replaces the form with an announced confirmation once sent", () => {
        mutationState.isSuccess = true;

        const html = renderContactForm(true, locale);

        expect(html).toContain("<output");
        expect(html).toContain(contactCopy.hero.sent.title);
        expect(html).not.toMatch(FORM_TAG);
    });
});

describe("contact form submission", () => {
    it("sends the message through the API in the page's language", async () => {
        renderContactForm(true, "es");

        await capturedMutation().mutationFn(MESSAGE);

        expect(sendContactMock).toHaveBeenCalledWith({
            ...MESSAGE,
            locale: "es",
        });
    });

    it.each(["CONTACT_UNAVAILABLE", "EMAIL_SEND_FAILED"])(
        "shows the translated %s copy in the page's language",
        (code) => {
            renderContactForm(true, "en");

            capturedMutation().onError(apiError(code));

            expect(errorAlertMock).toHaveBeenCalledWith(
                globalTranslations.en.packages.utils.apiErrors[
                    code as "CONTACT_UNAVAILABLE"
                ]
            );
        }
    );

    it("locks the submit button while the message is being sent", () => {
        expect(
            renderContactForm(true).match(SUBMIT_BUTTON_TAG)?.[0]
        ).not.toMatch(DISABLED_ATTRIBUTE);

        mutationState.isPending = true;

        expect(renderContactForm(true).match(SUBMIT_BUTTON_TAG)?.[0]).toMatch(
            DISABLED_ATTRIBUTE
        );
    });
});
