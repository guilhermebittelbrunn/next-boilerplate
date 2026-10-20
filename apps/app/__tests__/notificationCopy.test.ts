import { getDictionaryForLocale } from "@repo/internationalization/client";
import { locales } from "@repo/internationalization/utils";
import { NOTIFICATION_TYPES } from "@repo/sdk/src/types";
import { describe, expect, it } from "vitest";
import {
    describeNotification,
    notificationHref,
    notificationLevel,
    notificationPresentation,
} from "@/shared/lib/notifications";

const copyFor = (locale: string) =>
    getDictionaryForLocale(locale).dictionary.apps.app.shared.notifications;

describe("describeNotification", () => {
    it.each(locales)(
        "resolve título e corpo de cada tipo do core em %s",
        (locale) => {
            const copy = copyFor(locale);

            for (const type of NOTIFICATION_TYPES) {
                const { title, body } = describeNotification(copy, {
                    type,
                    params: {},
                });
                expect(title).toBe(copy.types[type].title);
                expect(body).toBe(copy.types[type].body);
                expect(title.length).toBeGreaterThan(0);
            }
        }
    );

    it("tem no dicionário exatamente os tipos que o contrato declara", () => {
        for (const locale of locales) {
            expect(Object.keys(copyFor(locale).types).sort()).toEqual(
                [...NOTIFICATION_TYPES].sort()
            );
        }
    });

    it("muda o texto da mesma notificação quando muda o idioma", () => {
        const notification = { type: "welcome", params: {} };

        const titles = locales.map(
            (locale) =>
                describeNotification(copyFor(locale), notification).title
        );

        expect(new Set(titles).size).toBe(locales.length);
    });

    it("cai no texto genérico para um tipo que este build não conhece", () => {
        const copy = copyFor("en");

        expect(
            describeNotification(copy, {
                type: "legacyTypeRemoved",
                params: {},
            })
        ).toEqual(copy.fallback);
    });

    it("não confunde uma chave herdada de Object com um tipo", () => {
        const copy = copyFor("en");

        expect(
            describeNotification(copy, { type: "constructor", params: {} })
        ).toEqual(copy.fallback);
    });

    it("interpola {param} com os parâmetros e deixa intacto o que falta", () => {
        const copy = {
            ...copyFor("en"),
            types: {
                ...copyFor("en").types,
                welcome: {
                    title: "Hi {name}",
                    body: "{count} seats, {missing}",
                },
            },
        };

        expect(
            describeNotification(copy, {
                type: "welcome",
                params: { name: "Ana", count: 3 },
            })
        ).toEqual({ title: "Hi Ana", body: "3 seats, {missing}" });
    });
});

describe("notificationHref", () => {
    it("leva os avisos de assinatura para a aba de cobrança no idioma atual", () => {
        for (const type of [
            "subscriptionPaymentPending",
            "subscriptionCanceled",
            "subscriptionReactivated",
        ]) {
            expect(notificationHref("es", { type, params: {} })).toBe(
                "/es/account?tab=billing"
            );
        }
    });

    it("não dá destino às boas-vindas nem a um tipo desconhecido", () => {
        expect(
            notificationHref("pt-br", { type: "welcome", params: {} })
        ).toBeNull();
        expect(
            notificationHref("pt-br", { type: "legacyTypeRemoved", params: {} })
        ).toBeNull();
    });
});

describe("notificationLevel", () => {
    it("deriva o nível do tipo e trata o desconhecido como informativo", () => {
        expect(notificationLevel("subscriptionPaymentPending")).toBe("warning");
        expect(notificationLevel("subscriptionCanceled")).toBe("error");
        expect(notificationLevel("legacyTypeRemoved")).toBe("info");
    });

    it("registra apresentação para todo tipo do contrato", () => {
        expect(Object.keys(notificationPresentation).sort()).toEqual(
            [...NOTIFICATION_TYPES].sort()
        );
    });
});
