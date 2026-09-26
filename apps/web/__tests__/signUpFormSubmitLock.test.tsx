import { globalTranslations } from "@repo/internationalization/translations/global";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { pendingState } = vi.hoisted(() => ({
    pendingState: {
        createAccount: false,
        signIn: false,
        googleSignIn: false,
    },
}));

vi.mock("@tanstack/react-query", () => ({
    useMutation: () => ({
        isPending: pendingState.createAccount,
        mutate: vi.fn(),
    }),
}));

vi.mock("@repo/auth/provider", () => ({
    default: () => ({
        loading: false,
        user: null,
        signIn: { isPending: pendingState.signIn, mutate: vi.fn() },
        signInWithGoogle: {
            isPending: pendingState.googleSignIn,
            mutate: vi.fn(),
        },
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

vi.mock("@/shared/lib/client", () => ({
    apiClient: { authApi: { signUp: vi.fn() } },
}));

vi.mock("next/navigation", () => ({
    useParams: () => ({ locale: "pt-br" }),
    usePathname: () => "/pt-br/sign-up",
    useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
    default: ({
        children,
        ...props
    }: {
        children: ReactNode;
        [prop: string]: unknown;
    }) => <a {...props}>{children}</a>,
}));

const { LocaleProvider } = await import("@repo/internationalization/client");
const { SignUpFormClient } = await import(
    "@/app/[locale]/sign-up/components/sign-up-form-client"
);

const signUpCopy = globalTranslations["pt-br"].apps.web.pages.signUp;
const BUTTON_MARKUP = /<button\b[^>]*>[\s\S]*?<\/button>/g;
const DISABLED_ATTRIBUTE = /\sdisabled(=""|\s|>)/;

function renderedButtonTag(label: string): string {
    const html = renderToString(
        <LocaleProvider>
            <SignUpFormClient />
        </LocaleProvider>
    );
    const buttons = html.match(BUTTON_MARKUP) ?? [];
    const button = buttons.find((markup) => markup.includes(label));
    if (!button) {
        throw new Error(`no button labelled "${label}" was rendered`);
    }
    return button.slice(0, button.indexOf(">") + 1);
}

function isDisabled(buttonTag: string): boolean {
    return DISABLED_ATTRIBUTE.test(buttonTag);
}

beforeEach(() => {
    pendingState.createAccount = false;
    pendingState.signIn = false;
    pendingState.googleSignIn = false;
});

describe("web SignUpFormClient submit lock", () => {
    it("enables the submit button while nothing is pending", () => {
        expect(isDisabled(renderedButtonTag(signUpCopy.form.submit))).toBe(
            false
        );
    });

    it("disables the submit button while the account is being created", () => {
        pendingState.createAccount = true;

        expect(isDisabled(renderedButtonTag(signUpCopy.form.submit))).toBe(
            true
        );
    });

    it("keeps the submit button disabled while the sign-in that follows the creation is pending", () => {
        pendingState.signIn = true;

        expect(isDisabled(renderedButtonTag(signUpCopy.form.submit))).toBe(
            true
        );
    });
});
