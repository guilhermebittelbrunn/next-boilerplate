import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
} from "@testing-library/react";
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    type MockInstance,
    vi,
} from "vitest";

const TAB_LABELS = {
    profile: "Perfil",
    security: "Segurança",
    preferences: "Preferências",
    billing: "Cobrança",
    privacy: "Privacidade",
};

const SECTION_DESCRIPTIONS = {
    profile: "Descrição do perfil",
    security: "Descrição da segurança",
    preferences: "Descrição das preferências",
    billing: "Descrição da cobrança",
    privacy: "Descrição da privacidade",
};

const SECTION_NAV_LABEL = "Seções da conta";

/** profile, security, preferences, billing e privacy. */
const ACCOUNT_TAB_COUNT = 5;
/** O modo simple não cobra assinatura, então a seção billing sai. */
const SIMPLE_MODE_TAB_COUNT = 4;

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
                    pages: {
                        common: {
                            account: {
                                tabs: TAB_LABELS,
                                sections: SECTION_DESCRIPTIONS,
                                sectionNav: { label: SECTION_NAV_LABEL },
                            },
                        },
                    },
                },
            },
        },
        locale: "pt-br",
    }),
}));

vi.mock("@/shared/components/ui/ImpersonationReadOnlyNotice", () => ({
    ImpersonationReadOnlyNotice: () => null,
}));

const stub = (label: string) => () => <div>{`${label}-panel`}</div>;

vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountProfileForm",
    () => ({ AccountProfileForm: stub("profile") })
);
vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountSecurityForm",
    () => ({ AccountSecurityForm: stub("security") })
);
vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountPreferencesForm",
    () => ({ AccountPreferencesForm: stub("preferences") })
);
vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountBillingPanel",
    () => ({ AccountBillingPanel: stub("billing") })
);
vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountPrivacyPanel",
    () => ({ AccountPrivacyPanel: stub("privacy") })
);

async function loadAccountTabs() {
    vi.resetModules();
    const freshModule = await import(
        "@/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountTabs"
    );
    return freshModule.AccountTabs;
}

const useUrl = (query: string) => {
    searchParamsMock.mockImplementation(() => new URLSearchParams(query));
};

let replaceStateSpy: MockInstance<History["replaceState"]>;

beforeEach(() => {
    replaceStateSpy = vi.spyOn(window.history, "replaceState");
});

afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    replaceStateSpy.mockRestore();
    useUrl("");
});

const selectedTab = () =>
    screen
        .getAllByRole("tab")
        .find((tab) => tab.getAttribute("aria-selected") === "true");

const lastReplacedUrl = () => {
    const call = replaceStateSpy.mock.calls.at(-1);
    return call ? String(call[2]) : null;
};

describe("AccountTabs — navegação vertical", () => {
    it("expõe uma lista vertical com as cinco seções e um select com as mesmas opções", async () => {
        useUrl("tab=profile");
        const AccountTabs = await loadAccountTabs();

        render(<AccountTabs account={undefined} />);

        const tablist = screen.getByRole("tablist", {
            name: SECTION_NAV_LABEL,
        });
        expect(tablist.getAttribute("aria-orientation")).toBe("vertical");
        expect(screen.getAllByRole("tab")).toHaveLength(ACCOUNT_TAB_COUNT);

        const select = screen.getByRole("combobox", {
            name: SECTION_NAV_LABEL,
        });
        const options = Array.from(
            select.querySelectorAll("option"),
            (option) => option.textContent
        );
        expect(options).toEqual(Object.values(TAB_LABELS));
    });

    it("abre a seção com um h2 com o rótulo dela e a descrição", async () => {
        useUrl("tab=security");
        const AccountTabs = await loadAccountTabs();

        render(<AccountTabs account={undefined} />);

        expect(
            screen.getByRole("heading", { level: 2, name: TAB_LABELS.security })
        ).toBeTruthy();
        expect(screen.getByText(SECTION_DESCRIPTIONS.security)).toBeTruthy();
        expect(screen.getByText("security-panel")).toBeTruthy();
    });
});

describe("AccountTabs — a seção acompanha a URL", () => {
    it("troca a seção quando a URL muda sem remontar o componente", async () => {
        useUrl("tab=security");
        const AccountTabs = await loadAccountTabs();
        const { rerender } = render(<AccountTabs account={undefined} />);
        expect(selectedTab()?.textContent).toBe(TAB_LABELS.security);

        useUrl("tab=privacy");
        rerender(<AccountTabs account={undefined} />);

        expect(selectedTab()?.textContent).toBe(TAB_LABELS.privacy);
        expect(screen.getByText("privacy-panel")).toBeTruthy();
    });

    it("ao clicar numa aba, regrava a URL preservando checkout", async () => {
        useUrl("tab=billing&checkout=success");
        const AccountTabs = await loadAccountTabs();
        render(<AccountTabs account={undefined} />);
        replaceStateSpy.mockClear();

        const securityTab = screen.getByRole("tab", {
            name: TAB_LABELS.security,
        });
        act(() => {
            fireEvent.mouseDown(securityTab, { button: 0, ctrlKey: false });
        });

        const url = new URL(lastReplacedUrl() ?? "", "http://localhost");
        expect(url.pathname).toBe("/pt-br/account");
        expect(url.searchParams.get("tab")).toBe("security");
        expect(url.searchParams.get("checkout")).toBe("success");
    });

    it("ao escolher no select, regrava a URL com a seção escolhida", async () => {
        useUrl("tab=profile");
        const AccountTabs = await loadAccountTabs();
        render(<AccountTabs account={undefined} />);
        replaceStateSpy.mockClear();

        fireEvent.change(
            screen.getByRole("combobox", { name: SECTION_NAV_LABEL }),
            { target: { value: "preferences" } }
        );

        expect(lastReplacedUrl()).toBe("/pt-br/account?tab=preferences");
    });

    it("normaliza a URL sem tab para ?tab=profile", async () => {
        useUrl("");
        const AccountTabs = await loadAccountTabs();

        render(<AccountTabs account={undefined} />);

        expect(lastReplacedUrl()).toBe("/pt-br/account?tab=profile");
        expect(selectedTab()?.textContent).toBe(TAB_LABELS.profile);
    });

    it("normaliza um tab inválido preservando os outros parâmetros", async () => {
        useUrl("tab=xyz&plan=price_1");
        const AccountTabs = await loadAccountTabs();

        render(<AccountTabs account={undefined} />);

        const url = new URL(lastReplacedUrl() ?? "", "http://localhost");
        expect(url.searchParams.get("tab")).toBe("profile");
        expect(url.searchParams.get("plan")).toBe("price_1");
    });

    it("não regrava a URL quando o tab já é válido", async () => {
        useUrl("tab=privacy");
        const AccountTabs = await loadAccountTabs();

        render(<AccountTabs account={undefined} />);

        expect(replaceStateSpy).not.toHaveBeenCalled();
    });
});

describe("AccountTabs — cobrança por modo de produto", () => {
    it("renderiza a seção billing no modo subscription", async () => {
        vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "subscription");
        useUrl("tab=billing");
        const AccountTabs = await loadAccountTabs();

        render(<AccountTabs account={undefined} />);

        expect(selectedTab()?.textContent).toBe(TAB_LABELS.billing);
        expect(screen.getByText("billing-panel")).toBeTruthy();
    });

    it("tira a seção billing da lista e do select no modo simple", async () => {
        vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "simple");
        useUrl("tab=profile");
        const AccountTabs = await loadAccountTabs();

        render(<AccountTabs account={undefined} />);

        expect(screen.getAllByRole("tab")).toHaveLength(SIMPLE_MODE_TAB_COUNT);
        expect(
            screen.queryByRole("tab", { name: TAB_LABELS.billing })
        ).toBeNull();
        expect(
            screen.queryByRole("option", { name: TAB_LABELS.billing })
        ).toBeNull();
    });

    it("abre o perfil e normaliza a URL quando o link pede ?tab=billing no modo simple", async () => {
        vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "simple");
        useUrl("tab=billing");
        const AccountTabs = await loadAccountTabs();

        render(<AccountTabs account={undefined} />);

        expect(selectedTab()?.textContent).toBe(TAB_LABELS.profile);
        expect(screen.queryByText("billing-panel")).toBeNull();
        expect(lastReplacedUrl()).toBe("/pt-br/account?tab=profile");
    });
});
