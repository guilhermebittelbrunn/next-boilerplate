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
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { completeMock } = vi.hoisted(() => ({ completeMock: vi.fn() }));

vi.mock("@repo/auth/provider", async () => {
    const { useMutation } = await import("@tanstack/react-query");
    return {
        default: () => ({
            loading: false,
            user: null,
            signInWithEmailLink: useMutation({
                mutationFn: (variables: unknown) => completeMock(variables),
            }),
        }),
    };
});

vi.mock("@repo/seo/metadata", () => ({
    createMetadata: (value: unknown) => value,
}));

vi.mock("next/navigation", () => ({
    useParams: () => ({ locale: "pt-br" }),
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/shared/lib/client", () => ({
    apiClient: { authApi: {} },
}));

const { default: EmailLinkSignIn } = await import(
    "@/app/[locale]/(unauthenticated)/sign-in/email-link/page"
);
const { EmailLinkCompletion } = await import(
    "@/app/[locale]/(unauthenticated)/sign-in/email-link/components/EmailLinkCompletion"
);
const { EmailLinkRequestForm } = await import(
    "@/app/[locale]/(unauthenticated)/sign-in/email-link/components/EmailLinkRequestForm"
);

const emailLinkCopy =
    globalTranslations["pt-br"].apps.app.pages.emailLinkSignIn;
const completeCopy = emailLinkCopy.complete;
const firebaseErrorCopy =
    globalTranslations["pt-br"].packages.auth.provider.firebase.error;
const EMAIL = "qa-magic-link@example.com";
const OTHER_EMAIL = "qa-magic-link-other@example.com";
const CODE = "code-1";
const REMEMBERED_EMAIL_KEY = "email-link-sign-in:email";

function firebaseError(code: string) {
    return Object.assign(new Error(code), { code });
}

function renderCompletion(oobCode: string | null = CODE) {
    const queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
    });
    render(
        <StrictMode>
            <QueryClientProvider client={queryClient}>
                <EmailLinkCompletion oobCode={oobCode} />
            </QueryClientProvider>
        </StrictMode>
    );
}

async function confirmWith(email: string) {
    const input = await screen.findByRole("textbox");
    fireEvent.change(input, { target: { value: email } });
    await act(() => {
        fireEvent.submit((input as HTMLInputElement).form as HTMLFormElement);
    });
}

async function pageFor(searchParams: Record<string, string | string[]>) {
    return (await EmailLinkSignIn({
        params: Promise.resolve({ locale: "pt-br" }),
        searchParams: Promise.resolve(searchParams),
    })) as { type: unknown; props: { oobCode?: string | null } };
}

beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    completeMock.mockResolvedValue({ user: { uid: "uid-1" } });
});

afterEach(cleanup);

describe("email-link page", () => {
    it("asks for a link when the query carries no code", async () => {
        const element = await pageFor({});

        expect(element.type).toBe(EmailLinkRequestForm);
    });

    it("completes the link when the query carries a code", async () => {
        const element = await pageFor({ oobCode: CODE });

        expect(element.type).toBe(EmailLinkCompletion);
        expect(element.props.oobCode).toBe(CODE);
    });

    it.each([
        ["an empty code", { oobCode: "" }],
        ["a repeated code", { oobCode: [CODE, CODE] }],
    ])("hands %s to the completion as missing", async (_label, query) => {
        const element = await pageFor(query);

        expect(element.type).toBe(EmailLinkCompletion);
        expect(element.props.oobCode).toBeNull();
    });
});

describe("EmailLinkCompletion", () => {
    it("completes once with the remembered address, even under StrictMode", async () => {
        window.localStorage.setItem(REMEMBERED_EMAIL_KEY, EMAIL);

        renderCompletion();

        expect(await screen.findByText(completeCopy.signingIn)).toBeTruthy();
        await waitFor(() => expect(completeMock).toHaveBeenCalledTimes(1));
        expect(completeMock).toHaveBeenCalledWith({
            email: EMAIL,
            oobCode: CODE,
        });
    });

    it("forgets the remembered address after signing in", async () => {
        window.localStorage.setItem(REMEMBERED_EMAIL_KEY, EMAIL);

        renderCompletion();

        await waitFor(() =>
            expect(window.localStorage.getItem(REMEMBERED_EMAIL_KEY)).toBeNull()
        );
    });

    it("sends nothing to Firebase without a remembered address and asks for it", async () => {
        renderCompletion();

        expect(
            await screen.findByText(completeCopy.confirm.title)
        ).toBeTruthy();
        expect(completeMock).not.toHaveBeenCalled();
        expect(
            (screen.getByRole("textbox") as HTMLInputElement).form?.noValidate
        ).toBe(true);

        await confirmWith(EMAIL);

        expect(completeMock).toHaveBeenCalledWith({
            email: EMAIL,
            oobCode: CODE,
        });
    });

    it("keeps the form with the mismatch error and lets the person try again", async () => {
        completeMock.mockRejectedValueOnce(firebaseError("auth/invalid-email"));
        renderCompletion();

        await confirmWith(OTHER_EMAIL);

        expect(await screen.findByText(completeCopy.mismatch)).toBeTruthy();
        expect(screen.getByText(completeCopy.confirm.title)).toBeTruthy();

        await confirmWith(EMAIL);

        expect(completeMock).toHaveBeenCalledTimes(2);
        expect(completeMock).toHaveBeenLastCalledWith({
            email: EMAIL,
            oobCode: CODE,
        });
    });

    it("asks for the address when the remembered one does not match the link", async () => {
        window.localStorage.setItem(REMEMBERED_EMAIL_KEY, OTHER_EMAIL);
        completeMock.mockRejectedValueOnce(firebaseError("auth/invalid-email"));

        renderCompletion();

        expect(await screen.findByText(completeCopy.mismatch)).toBeTruthy();
        expect(screen.getByText(completeCopy.confirm.title)).toBeTruthy();
    });

    it.each([
        ["auth/expired-action-code", completeCopy.expired],
        ["auth/invalid-action-code", completeCopy.invalid],
    ])(
        "answers %s with its card and a way to ask for another link",
        async (code, cardCopy) => {
            window.localStorage.setItem(REMEMBERED_EMAIL_KEY, EMAIL);
            completeMock.mockRejectedValue(firebaseError(code));

            renderCompletion();

            expect(await screen.findByText(cardCopy.title)).toBeTruthy();
            expect(screen.getByText(cardCopy.description)).toBeTruthy();
            const another = screen.getByRole("link", {
                name: emailLinkCopy.requestAnother,
            });
            expect(another.getAttribute("href")).toBe(
                "/pt-br/sign-in/email-link"
            );
        }
    );

    it("shows the invalid card for a missing code and spends nothing", async () => {
        window.localStorage.setItem(REMEMBERED_EMAIL_KEY, EMAIL);

        renderCompletion(null);

        expect(
            await screen.findByText(completeCopy.invalid.title)
        ).toBeTruthy();
        expect(completeMock).not.toHaveBeenCalled();
    });

    it.each([
        ["auth/user-disabled"],
        ["auth/operation-not-allowed"],
        ["auth/too-many-requests"],
    ] as const)(
        "answers %s with the translated refusal and a way back to sign in",
        async (code) => {
            window.localStorage.setItem(REMEMBERED_EMAIL_KEY, EMAIL);
            completeMock.mockRejectedValue(firebaseError(code));

            renderCompletion();

            expect(
                await screen.findByText(completeCopy.failed.title)
            ).toBeTruthy();
            expect(screen.getByText(firebaseErrorCopy[code])).toBeTruthy();
            const back = screen.getByRole("link", {
                name: emailLinkCopy.backToSignIn,
            });
            expect(back.getAttribute("href")).toBe("/pt-br/sign-in");
        }
    );

    it("drops the form after a typed address is accepted and offers the way back to sign in", async () => {
        renderCompletion();

        await confirmWith(EMAIL);

        const back = await screen.findByRole("link", {
            name: emailLinkCopy.backToSignIn,
        });
        expect(back.getAttribute("href")).toBe("/pt-br/sign-in");
        expect(screen.getByText(completeCopy.signingIn)).toBeTruthy();
        expect(screen.queryByRole("textbox")).toBeNull();
        expect(screen.queryByText(completeCopy.confirm.title)).toBeNull();
        expect(completeMock).toHaveBeenCalledTimes(1);
    });

    it("offers the way back to sign in once the remembered address is accepted", async () => {
        window.localStorage.setItem(REMEMBERED_EMAIL_KEY, EMAIL);

        renderCompletion();

        const back = await screen.findByRole("link", {
            name: emailLinkCopy.backToSignIn,
        });
        expect(back.getAttribute("href")).toBe("/pt-br/sign-in");
        expect(screen.getByText(completeCopy.signingIn)).toBeTruthy();
        expect(screen.queryByRole("textbox")).toBeNull();
    });

    it("keeps the way back hidden while the attempt is still running", async () => {
        window.localStorage.setItem(REMEMBERED_EMAIL_KEY, EMAIL);
        completeMock.mockReturnValue(
            new Promise(() => {
                // stays pending
            })
        );

        renderCompletion();

        expect(await screen.findByText(completeCopy.signingIn)).toBeTruthy();
        await waitFor(() => expect(completeMock).toHaveBeenCalledTimes(1));
        expect(
            screen.queryByRole("link", { name: emailLinkCopy.backToSignIn })
        ).toBeNull();
    });

    it("sends a single attempt for a burst of confirmations", async () => {
        completeMock.mockReturnValue(
            new Promise(() => {
                // stays pending
            })
        );
        renderCompletion();

        const input = await screen.findByRole("textbox");
        fireEvent.change(input, { target: { value: EMAIL } });
        const form = (input as HTMLInputElement).form as HTMLFormElement;
        await act(() => {
            fireEvent.submit(form);
            fireEvent.submit(form);
            fireEvent.submit(form);
        });

        expect(completeMock).toHaveBeenCalledTimes(1);
    });
});
