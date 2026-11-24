import type { ReactElement, ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { authProviderMounts } = vi.hoisted(() => ({
    authProviderMounts: { count: 0 },
}));

vi.mock("@repo/auth/provider", () => ({
    AuthProvider: ({ children }: { children: ReactNode }) => {
        authProviderMounts.count += 1;
        return children;
    },
    default: () => ({ user: null, loading: false }),
}));

vi.mock("@repo/analytics/server", () => ({
    resolveConsentBootstrap: async () => ({}),
}));

vi.mock("@repo/analytics/provider", () => ({
    AnalyticsProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@repo/internationalization/server", () => ({
    getDictionary: async () => ({ locale: "pt-br" }),
}));

vi.mock("@repo/internationalization/client", () => ({
    LocaleProvider: ({ children }: { children: ReactNode }) => children,
    getDictionary: () => ({ locale: "pt-br" }),
    useDictionary: () => ({ locale: "pt-br" }),
}));

vi.mock("@repo/design-system/lib/fonts", () => ({ fonts: "" }));

vi.mock("react-toastify", () => ({ ToastContainer: () => null }));

vi.mock("../app/shared/providers/QueryProvider", () => ({
    QueryProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("../app/[locale]/clientLayout", () => ({
    default: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("../app/[locale]/components/header", () => ({
    Header: () => null,
}));

vi.mock("../app/[locale]/components/footer", () => ({
    Footer: () => null,
}));

const { default: RootLayout } = await import("@/app/[locale]/layout");

type ElementWithChildren = ReactElement<{ children?: ReactNode }>;

describe("landing root layout", () => {
    it("mounts a single AuthProvider, the one inside DesignSystemProvider", async () => {
        const html = (await RootLayout({
            children: <p>landing page</p>,
            params: Promise.resolve({ locale: "pt-br" }),
        })) as ElementWithChildren;
        const body = html.props.children as ElementWithChildren;

        authProviderMounts.count = 0;
        const markup = renderToString(body.props.children);

        expect(markup).toContain("landing page");
        expect(authProviderMounts.count).toBe(1);
    });
});
