import { describe, expect, it } from "vitest";
import { resolvePlanCtaHref } from "@/shared/lib/pricingCta";

describe("resolvePlanCtaHref", () => {
    it("leva à aba billing do app no modo subscription", () => {
        expect(
            resolvePlanCtaHref({
                appUrl: "https://app.example.com",
                locale: "en",
                subscriptionMode: true,
            })
        ).toBe("https://app.example.com/en/account?tab=billing");
    });

    it("não duplica a barra quando a URL do app termina com uma", () => {
        expect(
            resolvePlanCtaHref({
                appUrl: "https://app.example.com/",
                locale: "pt-br",
                subscriptionMode: true,
            })
        ).toBe("https://app.example.com/pt-br/account?tab=billing");
    });

    it("mantém o destino de antes no modo simple", () => {
        expect(
            resolvePlanCtaHref({
                appUrl: "https://app.example.com",
                locale: "en",
                subscriptionMode: false,
            })
        ).toBe("https://app.example.com");
    });

    it("cai no cadastro da própria landing sem a URL do app", () => {
        expect(
            resolvePlanCtaHref({
                appUrl: undefined,
                locale: "es",
                subscriptionMode: true,
            })
        ).toBe("/es/sign-up");
    });
});
