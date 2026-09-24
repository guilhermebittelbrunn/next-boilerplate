import { env } from "@/env";

/**
 * The privacy policy lives in the marketing app. Without its URL, callers drop the link
 * and keep working.
 */
export const privacyPolicyUrl = (locale: string): string | null =>
    env.NEXT_PUBLIC_WEB_URL
        ? `${env.NEXT_PUBLIC_WEB_URL}/${locale}/legal/privacy`
        : null;
