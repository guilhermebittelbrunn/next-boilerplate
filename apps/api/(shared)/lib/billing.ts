import type { Locale } from "@repo/internationalization/utils";
import { isSubscriptionMode } from "@repo/next-config/product-mode";
import { isPaymentsConfigured, type Stripe } from "@repo/payments";
import type { PlanDTO, UserDTO } from "@repo/sdk/src/types";
import { env } from "@/env";
import { userRepository } from "../repositories/user.repository";
import { toPlanDTO } from "./billing-state";

const CATALOG_PAGE_SIZE = 100;
const TRAILING_SLASHES = /\/+$/;

const STRIPE_LOCALE: Record<Locale, "pt-BR" | "en" | "es"> = {
    "pt-br": "pt-BR",
    en: "en",
    es: "es",
};

/**
 * Selling needs the product in subscription mode, both Stripe keys (without the webhook
 * secret nothing ever reaches the profile) and the app URL the provider sends people back to.
 */
export function isBillingEnabled(): boolean {
    return (
        isSubscriptionMode() &&
        isPaymentsConfigured() &&
        Boolean(env.NEXT_PUBLIC_APP_URL)
    );
}

export function toStripeLocale(locale: Locale): "pt-BR" | "en" | "es" {
    return STRIPE_LOCALE[locale];
}

export function billingReturnUrl(
    locale: Locale,
    outcome?: "success" | "canceled"
): string {
    const appUrl = (env.NEXT_PUBLIC_APP_URL ?? "").replace(
        TRAILING_SLASHES,
        ""
    );
    const base = `${appUrl}/${locale}/account?tab=billing`;
    return outcome ? `${base}&checkout=${outcome}` : base;
}

export function isStripeResourceMissing(error: unknown): boolean {
    return (error as { code?: unknown } | null)?.code === "resource_missing";
}

export async function listPlans(stripe: Stripe): Promise<PlanDTO[]> {
    const prices = await stripe.prices.list({
        active: true,
        type: "recurring",
        expand: ["data.product"],
        limit: CATALOG_PAGE_SIZE,
    });

    return prices.data
        .map(toPlanDTO)
        .filter((plan): plan is PlanDTO => plan !== null)
        .sort(
            (a, b) =>
                (a.unitAmount ?? Number.POSITIVE_INFINITY) -
                (b.unitAmount ?? Number.POSITIVE_INFINITY)
        );
}

/** The body only names a price; whether it can be sold is asked of Stripe. */
export async function findRecurringPrice(
    stripe: Stripe,
    priceId: string
): Promise<Stripe.Price | null> {
    try {
        const price = await stripe.prices.retrieve(priceId, {
            expand: ["product"],
        });
        return toPlanDTO(price) ? price : null;
    } catch (error) {
        if (isStripeResourceMissing(error)) {
            return null;
        }
        throw error;
    }
}

/**
 * The idempotency key makes a double click, or a retry after the link failed to save,
 * land on the same customer for 24 hours instead of creating a second one.
 */
export async function ensureStripeCustomer(
    stripe: Stripe,
    profile: UserDTO,
    email: string | null
): Promise<string> {
    if (profile.stripeCustomerId) {
        return profile.stripeCustomerId;
    }

    const customer = await stripe.customers.create(
        {
            email: email ?? undefined,
            metadata: { profileId: profile.id },
        },
        { idempotencyKey: `customer-${profile.id}` }
    );

    await userRepository.linkStripeCustomer(profile.id, customer.id);

    return customer.id;
}

export class MissingRedirectUrlError extends Error {
    constructor() {
        super("Stripe answered without a redirect URL");
        this.name = "MissingRedirectUrlError";
    }
}

export async function createCheckoutSession(
    stripe: Stripe,
    input: {
        customerId: string;
        priceId: string;
        profileId: string;
        locale: Locale;
    }
): Promise<string> {
    const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: input.customerId,
        line_items: [{ price: input.priceId, quantity: 1 }],
        client_reference_id: input.profileId,
        metadata: { profileId: input.profileId },
        subscription_data: { metadata: { profileId: input.profileId } },
        success_url: billingReturnUrl(input.locale, "success"),
        cancel_url: billingReturnUrl(input.locale, "canceled"),
        locale: toStripeLocale(input.locale),
    });

    if (!session.url) {
        throw new MissingRedirectUrlError();
    }

    return session.url;
}

export async function createPortalSession(
    stripe: Stripe,
    customerId: string,
    locale: Locale
): Promise<string> {
    const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: billingReturnUrl(locale),
        locale: toStripeLocale(locale),
    });

    return session.url;
}

/** A subscription Stripe no longer has is already what the erasure wants. */
export async function cancelSubscriptionForErasure(
    stripe: Stripe,
    subscriptionId: string
): Promise<void> {
    try {
        await stripe.subscriptions.cancel(subscriptionId);
    } catch (error) {
        if (isStripeResourceMissing(error)) {
            return;
        }
        throw error;
    }
}
