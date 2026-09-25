import { isValidIanaTimeZone } from "@repo/shared/utils/helpers/auth-request-headers";

export const TIME_ZONE_COOKIE = "x-timezone";

/**
 * The zone both the server render and the hydrating client use while the browser's zone is
 * still unknown. It has to be the same on both sides: a date printed in the server's local
 * zone and re-printed in the browser's makes React discard the server tree.
 */
export const FALLBACK_DISPLAY_TIME_ZONE = "UTC";

export function resolveDisplayTimeZone(
    value: string | null | undefined
): string | undefined {
    return value && isValidIanaTimeZone(value) ? value : undefined;
}
