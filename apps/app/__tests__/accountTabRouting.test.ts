import { afterEach, describe, expect, it, vi } from "vitest";

async function loadRouting() {
    vi.resetModules();
    return await import(
        "@/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/accountTabRouting"
    );
}

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("resolveAccountTab", () => {
    it.each(["profile", "security", "preferences", "billing", "privacy"])(
        "aceita a seção %s no modo subscription",
        async (tab) => {
            vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "subscription");
            const { resolveAccountTab } = await loadRouting();

            expect(resolveAccountTab(tab)).toBe(tab);
        }
    );

    it.each([null, "", "xyz", "PROFILE"])(
        "cai no perfil quando a URL pede %j",
        async (raw) => {
            const { resolveAccountTab } = await loadRouting();

            expect(resolveAccountTab(raw)).toBe("profile");
        }
    );

    it("cai no perfil para billing no modo simple", async () => {
        vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "simple");
        const { resolveAccountTab, accountTabValues } = await loadRouting();

        expect(resolveAccountTab("billing")).toBe("profile");
        expect(accountTabValues).not.toContain("billing");
    });
});

describe("accountTabHref", () => {
    it("troca só o tab e preserva checkout e plan", async () => {
        const { accountTabHref } = await loadRouting();
        const current = new URLSearchParams(
            "tab=billing&checkout=success&plan=price_123"
        );

        const href = accountTabHref("/pt-br/account", current, "security");
        const params = new URL(href, "http://localhost").searchParams;

        expect(href.startsWith("/pt-br/account?")).toBe(true);
        expect(params.get("tab")).toBe("security");
        expect(params.get("checkout")).toBe("success");
        expect(params.get("plan")).toBe("price_123");
    });

    it("acrescenta o tab quando a URL não tem nenhum", async () => {
        const { accountTabHref } = await loadRouting();

        expect(
            accountTabHref("/en/account", new URLSearchParams(""), "profile")
        ).toBe("/en/account?tab=profile");
    });
});
