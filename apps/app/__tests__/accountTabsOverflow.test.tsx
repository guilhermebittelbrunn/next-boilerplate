import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

/** profile, security, preferences, billing e privacy. */
const ACCOUNT_TAB_COUNT = 5;
/** O modo simple não cobra assinatura, então a aba billing sai. */
const SIMPLE_MODE_TAB_COUNT = 4;

const TAB_LABELS = {
    profile: "Perfil",
    security: "Segurança",
    preferences: "Preferências",
    billing: "Cobrança",
    privacy: "Privacidade",
};

const { searchParamsMock } = vi.hoisted(() => ({
    searchParamsMock: vi.fn(() => new URLSearchParams("")),
}));

vi.mock("next/navigation", () => ({
    usePathname: () => "/pt-br/account",
    useSearchParams: () => searchParamsMock(),
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
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountBillingPanel",
    () => ({ AccountBillingPanel: stub("billing").default })
);
vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountPrivacyPanel",
    () => ({ AccountPrivacyPanel: stub("privacy").default })
);

async function loadAccountTabs() {
    vi.resetModules();
    const freshModule = await import(
        "@/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountTabs"
    );
    return freshModule.AccountTabs;
}

const { AccountTabs } = await import(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountTabs"
);

afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    searchParamsMock.mockImplementation(() => new URLSearchParams(""));
});

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

describe("AccountTabs — cobrança por modo de produto", () => {
    it("renderiza a aba billing no modo subscription", async () => {
        vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "subscription");
        const Tabs = await loadAccountTabs();

        render(<Tabs account={undefined} />);

        expect(
            screen.getByRole("tab", { name: TAB_LABELS.billing })
        ).toBeTruthy();
    });

    it("tira a aba billing no modo simple", async () => {
        vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "simple");
        const Tabs = await loadAccountTabs();

        render(<Tabs account={undefined} />);

        expect(screen.getAllByRole("tab")).toHaveLength(SIMPLE_MODE_TAB_COUNT);
        expect(
            screen.queryByRole("tab", { name: TAB_LABELS.billing })
        ).toBeNull();
    });

    it("abre o perfil quando o link pede ?tab=billing no modo simple", async () => {
        vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "simple");
        searchParamsMock.mockImplementation(
            () => new URLSearchParams("tab=billing")
        );
        const Tabs = await loadAccountTabs();

        render(<Tabs account={undefined} />);

        const profileTab = screen.getByRole("tab", {
            name: TAB_LABELS.profile,
        });
        expect(profileTab.getAttribute("aria-selected")).toBe("true");
        expect(screen.queryByText("billing")).toBeNull();
    });
});
