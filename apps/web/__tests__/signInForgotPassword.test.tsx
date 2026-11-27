// @vitest-environment jsdom
import { globalTranslations } from "@repo/internationalization/translations/global";
import { type Locale, locales } from "@repo/internationalization/utils";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { params, envMock } = vi.hoisted(() => ({
    params: { locale: "en" } as Record<string, string>,
    envMock: { NEXT_PUBLIC_APP_URL: undefined as string | undefined },
}));

vi.mock("@/env", () => ({ env: envMock }));

vi.mock("@repo/auth/provider", () => ({
    default: () => ({
        user: null,
        loading: false,
        signIn: { isPending: false, mutate: vi.fn() },
        signInWithGoogle: { isPending: false, mutate: vi.fn() },
    }),
}));

vi.mock("@/shared/lib/client", () => ({
    apiClient: { setAuthorizationHeader: vi.fn() },
}));

vi.mock("next/navigation", () => ({
    useParams: () => params,
    usePathname: () => `/${params.locale}/sign-in`,
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
const { SignInFormClient } = await import(
    "@/app/[locale]/sign-in/components/sign-in-form-client"
);

function renderSignIn(locale: Locale) {
    params.locale = locale;
    render(
        <LocaleProvider>
            <SignInFormClient />
        </LocaleProvider>
    );
}

afterEach(() => {
    cleanup();
    envMock.NEXT_PUBLIC_APP_URL = undefined;
});

describe("web sign-in forgot password link", () => {
    it.each(locales)(
        "points at the app's password recovery in %s",
        (locale) => {
            envMock.NEXT_PUBLIC_APP_URL = "https://app.example.com/";

            renderSignIn(locale);

            const link = screen.getByRole("link", {
                name: globalTranslations[locale].apps.web.pages.signIn
                    .forgotPassword,
            });
            expect(link.getAttribute("href")).toBe(
                `https://app.example.com/${locale}/forgot-password`
            );
        }
    );

    it("is not rendered when the app URL is empty", () => {
        envMock.NEXT_PUBLIC_APP_URL = "";

        renderSignIn("en");

        expect(
            screen.queryByRole("link", {
                name: globalTranslations.en.apps.web.pages.signIn
                    .forgotPassword,
            })
        ).toBeNull();
        expect(
            screen.getByRole("link", {
                name: globalTranslations.en.apps.web.pages.signIn.signUp,
            })
        ).toBeTruthy();
    });
});
