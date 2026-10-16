import { describe, expect, it } from "vitest";
import { resolvePlanCtaHref } from "@/shared/lib/pricingCta";

describe("resolvePlanCtaHref", () => {
    it("leva ao cadastro do app com a aba billing e o plano dentro do redirect", () => {
        const href = resolvePlanCtaHref({
            appUrl: "https://app.example.com",
            locale: "en",
            subscriptionMode: true,
            priceId: "price_pro",
        });

        expect(href).toBe(
            "https://app.example.com/en/sign-up?redirect=%2Fen%2Faccount%3Ftab%3Dbilling%26plan%3Dprice_pro"
        );
        expect(new URL(href).searchParams.get("redirect")).toBe(
            "/en/account?tab=billing&plan=price_pro"
        );
    });

    it("não duplica a barra quando a URL do app termina com uma", () => {
        expect(
            resolvePlanCtaHref({
                appUrl: "https://app.example.com/",
                locale: "pt-br",
                subscriptionMode: true,
                priceId: "price_pro",
            })
        ).toBe(
            "https://app.example.com/pt-br/sign-up?redirect=%2Fpt-br%2Faccount%3Ftab%3Dbilling%26plan%3Dprice_pro"
        );
    });

    it("mantém o destino de antes no modo simple", () => {
        expect(
            resolvePlanCtaHref({
                appUrl: "https://app.example.com",
                locale: "en",
                subscriptionMode: false,
                priceId: "price_pro",
            })
        ).toBe("https://app.example.com");
    });

    it("cai no cadastro da própria landing sem a URL do app", () => {
        expect(
            resolvePlanCtaHref({
                appUrl: undefined,
                locale: "es",
                subscriptionMode: true,
                priceId: "price_pro",
            })
        ).toBe("/es/sign-up");
    });
});
