import "server-only";
import Stripe from "stripe";
import { keys } from "./keys";

const API_VERSION = "2025-09-30.clover";

let client: Stripe | null = null;

/**
 * The Stripe SDK throws when the secret key is empty, so the client can only be
 * built once a key is actually configured — never at module load, which would
 * break `next build` on any environment without Stripe credentials.
 */
export const getStripe = (): Stripe | null => {
    const secretKey = keys().STRIPE_SECRET_KEY;

    if (!secretKey) {
        return null;
    }

    client ??= new Stripe(secretKey, { apiVersion: API_VERSION });

    return client;
};

export const getWebhookSecret = (): string | null =>
    keys().STRIPE_WEBHOOK_SECRET ?? null;

/**
 * Both halves or nothing: without the webhook secret no subscription state ever reaches
 * the profile, so selling with only the secret key would charge people the app cannot see.
 */
export const isPaymentsConfigured = (): boolean => {
    const { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } = keys();
    return Boolean(STRIPE_SECRET_KEY && STRIPE_WEBHOOK_SECRET);
};

export type { Stripe } from "stripe";
