import { getBrand } from "@repo/next-config/brand";
import { displayNameSender } from "./keys";

const UNSAFE_NAME_CHARS = /["\\<>\r\n]/g;
const RFC5322_SPECIALS = /[()<>[\]:;@\\,."]/;

/**
 * Names a bare `RESEND_FROM` after the configured brand, so inboxes show the product
 * instead of the address. A sender that already carries a name is the fork's explicit
 * choice and is kept. Characters that could end the header or break the address parse
 * are dropped, and the name is quoted whenever RFC 5322 requires it.
 */
export const withBrandSender = (from: string): string => {
    const brand = getBrand();
    if (brand.isDefaultName || displayNameSender.test(from)) {
        return from;
    }
    const safeName = brand.name.replace(UNSAFE_NAME_CHARS, "").trim();
    if (!safeName) {
        return from;
    }
    const displayName = RFC5322_SPECIALS.test(safeName)
        ? `"${safeName}"`
        : safeName;
    return `${displayName} <${from}>`;
};
