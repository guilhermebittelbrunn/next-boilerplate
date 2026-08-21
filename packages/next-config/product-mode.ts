/**
 * Product navigation/auth model — a single typed switch every fork sets once.
 *
 * - `subscription`: the user operates inside the **app** panel (e.g. a SaaS with
 *   billing); the admin manages users/dashboard in the panel.
 * - `simple`: the user operates inside **web** (e.g. ad-supported), reaching areas
 *   from the web navbar; the panel is **admin-only**.
 *
 * Read from `NEXT_PUBLIC_PRODUCT_MODE` (inlined at build, safe on client + server).
 * Defaults to `subscription`. UIs per mode are layered on top of this flag.
 */
export type ProductMode = "subscription" | "simple";

export const DEFAULT_PRODUCT_MODE: ProductMode = "subscription";

export function getProductMode(): ProductMode {
    return process.env.NEXT_PUBLIC_PRODUCT_MODE === "simple"
        ? "simple"
        : DEFAULT_PRODUCT_MODE;
}

/** True when the app panel is the user's operational area (vs. admin-only). */
export function isSubscriptionMode(): boolean {
    return getProductMode() === "subscription";
}
