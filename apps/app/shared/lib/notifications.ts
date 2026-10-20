import type { IGetDictionaryResponse } from "@repo/internationalization/utils";
import type { NotificationDTO, NotificationType } from "@repo/sdk/src/types";
import { withLocalePath } from "./localePath";

export type NotificationLevel = "info" | "warning" | "error";

export type NotificationsCopy =
    IGetDictionaryResponse["dictionary"]["apps"]["app"]["shared"]["notifications"];

type NotificationPresentation = {
    level: NotificationLevel;
    /** Path without the locale prefix. Built here, never stored, so no URL travels in a notification. */
    href?: (params: NotificationDTO["params"]) => string;
};

const BILLING_TAB_PATH = "/account?tab=billing";

export const notificationPresentation: Record<
    NotificationType,
    NotificationPresentation
> = {
    welcome: { level: "info" },
    subscriptionPaymentPending: {
        level: "warning",
        href: () => BILLING_TAB_PATH,
    },
    subscriptionCanceled: { level: "error", href: () => BILLING_TAB_PATH },
    subscriptionReactivated: { level: "info", href: () => BILLING_TAB_PATH },
};

function presentationOf(type: string): NotificationPresentation | null {
    return Object.hasOwn(notificationPresentation, type)
        ? notificationPresentation[type as NotificationType]
        : null;
}

function interpolate(
    template: string,
    params: NotificationDTO["params"]
): string {
    return template.replace(/\{(\w+)\}/g, (placeholder, key: string) =>
        Object.hasOwn(params, key) ? String(params[key]) : placeholder
    );
}

/** A type this build does not know falls back to generic copy instead of breaking the list. */
export function describeNotification(
    copy: NotificationsCopy,
    notification: Pick<NotificationDTO, "type" | "params">
): { title: string; body: string } {
    const typeCopy = Object.hasOwn(copy.types, notification.type)
        ? copy.types[notification.type as keyof NotificationsCopy["types"]]
        : copy.fallback;

    return {
        title: interpolate(typeCopy.title, notification.params),
        body: interpolate(typeCopy.body, notification.params),
    };
}

export function notificationLevel(type: string): NotificationLevel {
    return presentationOf(type)?.level ?? "info";
}

export function notificationHref(
    locale: string,
    notification: Pick<NotificationDTO, "type" | "params">
): string | null {
    const href = presentationOf(notification.type)?.href;
    return href ? withLocalePath(locale, href(notification.params)) : null;
}
