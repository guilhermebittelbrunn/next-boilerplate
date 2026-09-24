import { env } from "@/env";

export type PrivacyChannel = { href: string; label: string };

/**
 * An empty value is how a fork declines the setting, so a blank address counts the same
 * as an absent one and the channel falls back to the contact form, which already
 * delivers to the owner inbox.
 */
export function resolvePrivacyChannel(
    locale: string,
    formLabel: string
): PrivacyChannel {
    const address = env.NEXT_PUBLIC_PRIVACY_CONTACT || null;

    return address
        ? { href: `mailto:${address}`, label: address }
        : { href: `/${locale}/contact`, label: formLabel };
}
