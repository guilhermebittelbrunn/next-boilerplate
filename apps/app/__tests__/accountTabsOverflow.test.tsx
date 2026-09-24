import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

/** profile, security, preferences, billing e privacy. */
const ACCOUNT_TAB_COUNT = 5;

const TAB_LABELS = {
    profile: "Perfil",
    security: "Segurança",
    preferences: "Preferências",
    billing: "Cobrança",
    privacy: "Privacidade",
};

vi.mock("next/navigation", () => ({
    usePathname: () => "/pt-br/account",
    useSearchParams: () => new URLSearchParams(""),
}));

vi.mock("@repo/internationalization/client", () => ({
    getDictionary: () => ({
        dictionary: {
            apps: {
                app: {
                    pages: { common: { account: { tabs: TAB_LABELS } } },
                },
            },
        },
        locale: "pt-br",
    }),
}));

vi.mock("@/shared/components/ui/ImpersonationReadOnlyNotice", () => ({
    ImpersonationReadOnlyNotice: () => null,
}));

const stub = (label: string) => ({ default: () => <div>{label}</div> });

vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountProfileForm",
    () => ({ AccountProfileForm: stub("profile").default })
);
vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountSecurityForm",
    () => ({ AccountSecurityForm: stub("security").default })
);
vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountPreferencesForm",
    () => ({ AccountPreferencesForm: stub("preferences").default })
);
vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountBillingPlaceholder",
    () => ({ AccountBillingPlaceholder: stub("billing").default })
);
vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountPrivacyPanel",
    () => ({ AccountPrivacyPanel: stub("privacy").default })
);

const { AccountTabs } = await import(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountTabs"
);

afterEach(cleanup);

/**
 * jsdom does not lay out, so these assert the containment, not the pixels. The strip is
 * `inline-flex w-fit` with no scroll of its own: whatever it measures, it has to be inside
 * something that scrolls, or the page grows with it.
 */
describe("AccountTabs — a faixa de abas não alarga a página", () => {
    it("mantém a lista de abas dentro de um contêiner que rola na horizontal", () => {
        render(<AccountTabs account={undefined} />);

        const strip = screen.getByRole("tablist");
        const scroller = strip.parentElement;

        expect(scroller?.className).toContain("overflow-x-auto");
        expect(scroller?.className).toContain("w-full");
    });

    it("renderiza as cinco abas, que é o que passou a não caber", () => {
        render(<AccountTabs account={undefined} />);

        expect(screen.getAllByRole("tab")).toHaveLength(ACCOUNT_TAB_COUNT);
    });
});
