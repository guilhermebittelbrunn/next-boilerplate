import { type Locale, resolveLocale } from "@repo/internationalization/utils";
import { Resend } from "resend";
import { emailCopy } from "./copy";
import { keys } from "./keys";
import type { EmailTemplate } from "./template";

export type SendFailureReason =
    | "not-configured"
    | "invalid-recipient"
    | "provider-error";

export type SendResult =
    | { sent: true; id: string | null }
    | { sent: false; reason: SendFailureReason };

export type SendEmailInput<TData> = {
    template: EmailTemplate<TData>;
    to: string | string[] | null | undefined;
    data: TData;
    locale?: string | null;
    replyTo?: string;
};

let cachedClient: Resend | null = null;

/**
 * Built on first use, never at import time: the Resend constructor throws when the
 * token is missing, so a fork without credentials would break merely by importing
 * this package.
 */
const getResendClient = (token: string | undefined): Resend | null => {
    if (!token) {
        return null;
    }
    cachedClient ??= new Resend(token);
    return cachedClient;
};

/** One line, stable prefix, no recipient, subject or body: an email that did not go out is no reason to start retaining personal data. */
const logEmail = (
    event: "skipped" | "failed",
    template: string,
    reason: SendFailureReason,
    locale: Locale
): void => {
    console.warn(
        `[email] ${event} template=${template} reason=${reason} locale=${locale}`
    );
};

/**
 * Blanks are dropped rather than merely tolerated: Resend refuses the whole
 * message when a single address in the list is invalid, so letting one through
 * would lose the email for every other recipient too.
 */
const cleanRecipients = (
    to: string | string[] | null | undefined
): string | string[] | null => {
    if (typeof to === "string") {
        return to.trim() || null;
    }

    if (!Array.isArray(to)) {
        return null;
    }

    const addresses = to
        .map((address) => address.trim())
        .filter((address) => address !== "");

    return addresses.length > 0 ? addresses : null;
};

/** Whether email can actually leave: Resend requires both a sender and a token. */
export const isEmailEnabled = (): boolean => {
    const { RESEND_FROM, RESEND_TOKEN } = keys();
    return Boolean(RESEND_FROM && RESEND_TOKEN);
};

/** The address a fork sends from, and the inbox contact messages land in. */
export const ownerInbox = (): string | null => keys().RESEND_FROM ?? null;

/**
 * Renders a template in the requested language and hands it to the provider.
 * Answers with a decision instead of throwing, so a missing key or a provider
 * outage never takes down the operation that asked for the email.
 */
export const sendEmail = async <TData>({
    template,
    to,
    data,
    locale,
    replyTo,
}: SendEmailInput<TData>): Promise<SendResult> => {
    const resolvedLocale = resolveLocale(locale);
    const { RESEND_FROM: from, RESEND_TOKEN: token } = keys();
    const client = getResendClient(token);

    if (!(client && from)) {
        logEmail("skipped", template.id, "not-configured", resolvedLocale);
        return { sent: false, reason: "not-configured" };
    }

    const recipients = cleanRecipients(to);

    if (!recipients) {
        logEmail("skipped", template.id, "invalid-recipient", resolvedLocale);
        return { sent: false, reason: "invalid-recipient" };
    }

    try {
        const { data: sent, error } = await client.emails.send({
            from,
            to: recipients,
            replyTo,
            subject: template.subject(emailCopy(resolvedLocale), data),
            react: template.render({ locale: resolvedLocale, data }),
        });

        if (error) {
            logEmail("failed", template.id, "provider-error", resolvedLocale);
            return { sent: false, reason: "provider-error" };
        }

        return { sent: true, id: sent?.id ?? null };
    } catch {
        // The provider message can carry the recipient address, so it is deliberately dropped.
        logEmail("failed", template.id, "provider-error", resolvedLocale);
        return { sent: false, reason: "provider-error" };
    }
};
