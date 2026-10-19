import { env } from "@/env";

/** The contact form lives in the marketing app. Without its URL, callers drop the link. */
export const contactPageUrl = (locale: string): string | null =>
    env.NEXT_PUBLIC_WEB_URL
        ? `${env.NEXT_PUBLIC_WEB_URL}/${locale}/contact`
        : null;
