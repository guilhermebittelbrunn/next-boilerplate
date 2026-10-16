import { describe, expect, it, vi } from "vitest";

vi.mock("@repo/seo/metadata", () => ({
    createMetadata: (value: unknown) => value,
}));

vi.mock(
    "@/app/[locale]/(unauthenticated)/sign-in/components/SignInForm",
    () => ({
        SignInForm: () => null,
    })
);

vi.mock(
    "@/app/[locale]/(unauthenticated)/sign-up/components/SignUpFormClient",
    () => ({ default: () => null })
);

const { default: SignIn } = await import(
    "@/app/[locale]/(unauthenticated)/sign-in/page"
);
const { default: SignUp } = await import(
    "@/app/[locale]/(unauthenticated)/sign-up/page"
);
const { SignInForm } = await import(
    "@/app/[locale]/(unauthenticated)/sign-in/components/SignInForm"
);
const { default: SignUpFormClient } = await import(
    "@/app/[locale]/(unauthenticated)/sign-up/components/SignUpFormClient"
);

type PageElement = { type: unknown; props: { redirect: string | null } };

const pages = [
    { name: "sign-in", Page: SignIn, Form: SignInForm },
    { name: "sign-up", Page: SignUp, Form: SignUpFormClient },
] as const;

async function render(
    Page: (typeof pages)[number]["Page"],
    searchParams: { redirect?: string | string[] }
) {
    return (await Page({
        params: Promise.resolve({ locale: "pt-br" }),
        searchParams: Promise.resolve(searchParams),
    })) as unknown as PageElement;
}

describe.each(pages)("$name page", ({ Page, Form }) => {
    it("hands the redirect from the URL to the form", async () => {
        const element = await render(Page, {
            redirect: "/pt-br/account?tab=billing&plan=price_1",
        });

        expect(element.type).toBe(Form);
        expect(element.props.redirect).toBe(
            "/pt-br/account?tab=billing&plan=price_1"
        );
    });

    it("hands no redirect when the URL has none", async () => {
        const element = await render(Page, {});

        expect(element.props.redirect).toBeNull();
    });

    it("hands no redirect when the parameter repeats", async () => {
        const element = await render(Page, {
            redirect: ["/pt-br/account", "/pt-br/entities"],
        });

        expect(element.props.redirect).toBeNull();
    });
});
