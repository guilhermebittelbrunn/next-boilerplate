import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
    useParams: () => ({ locale: "pt-br" }),
}));

async function settingsItemUrls() {
    vi.resetModules();
    const { useCommonNavRoutes } = await import(
        "@/app/[locale]/(authenticated)/(common)/routes"
    );
    const { result } = renderHook(() => useCommonNavRoutes());
    const settings = result.current.find((item) => "items" in item);
    return settings && "items" in settings
        ? settings.items.map((item) => item.url)
        : [];
}

async function topLevelUrls() {
    vi.resetModules();
    const { useCommonNavRoutes } = await import(
        "@/app/[locale]/(authenticated)/(common)/routes"
    );
    const { result } = renderHook(() => useCommonNavRoutes());
    return result.current.map((item) => ("url" in item ? item.url : null));
}

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("useCommonNavRoutes — cobrança por modo de produto", () => {
    it("leva à aba billing no modo subscription", async () => {
        vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "subscription");

        expect(await settingsItemUrls()).toContain(
            "/pt-br/account?tab=billing"
        );
    });

    it("tira o item billing no modo simple, mantendo os demais", async () => {
        vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "simple");

        const urls = await settingsItemUrls();

        expect(urls).not.toContain("/pt-br/account?tab=billing");
        expect(urls).toEqual([
            "/pt-br/account?tab=profile",
            "/pt-br/account?tab=security",
            "/pt-br/account?tab=preferences",
            "/pt-br/account?tab=privacy",
        ]);
    });
});

describe("useCommonNavRoutes — equipe", () => {
    /** A B2C fork leaves the switch empty and must not see the team page anywhere. */
    it.each(["", "false"])(
        "esconde a equipe com a chave em %j",
        async (value) => {
            vi.stubEnv("NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED", value);

            expect(await topLevelUrls()).not.toContain("/pt-br/organization");
        }
    );

    it("mostra a equipe entre entidades e configurações quando ligada", async () => {
        vi.stubEnv("NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED", "true");

        const urls = await topLevelUrls();

        expect(urls.indexOf("/pt-br/organization")).toBe(
            urls.indexOf("/pt-br/entities") + 1
        );
    });
});
