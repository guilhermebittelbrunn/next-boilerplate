import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const keys = () =>
    createEnv({
        server: {
            ANALYZE: z.string().optional(),

            // Added by Vercel
            NEXT_RUNTIME: z.enum(["nodejs", "edge"]).optional(),

            // Vercel environment variables
            VERCEL: z.string().optional(),
            VERCEL_ENV: z
                .enum(["development", "preview", "production"])
                .optional(),
            VERCEL_URL: z.string().optional(),
            VERCEL_REGION: z.string().optional(),
            VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
        },
        client: {
            NEXT_PUBLIC_APP_URL: z.url().optional(),
            NEXT_PUBLIC_WEB_URL: z.url().optional(),
            NEXT_PUBLIC_API_URL: z.url().optional(),
            NEXT_PUBLIC_DOCS_URL: z.url().optional(),
            /** Default locale (e.g. pt-br). Used when URL has no locale; all dictionary consumers respect this. */
            NEXT_PUBLIC_DEFAULT_LOCALE: z.string().optional(),
            /**
             * Product navigation/auth model. `subscription`: users operate in the app
             * panel (admin manages users); `simple`: users operate inside web, panel is
             * admin-only. Defaults to `subscription`. See `getProductMode()`.
             */
            NEXT_PUBLIC_PRODUCT_MODE: z
                .enum(["subscription", "simple"])
                .optional(),
            /**
             * Address the legal pages publish as the privacy channel. Empty, they link
             * the contact form instead, which every fork already has working.
             */
            NEXT_PUBLIC_PRIVACY_CONTACT: z.string().optional(),
            /**
             * Brand and SEO identity. Plain strings on purpose: the example env files
             * publish them empty, and `getBrand()` validates the format and falls back.
             */
            NEXT_PUBLIC_APP_NAME: z.string().optional(),
            NEXT_PUBLIC_APP_LOGO_URL: z.string().optional(),
            NEXT_PUBLIC_APP_SUPPORT_EMAIL: z.string().optional(),
            NEXT_PUBLIC_APP_AUTHOR: z.string().optional(),
            NEXT_PUBLIC_APP_AUTHOR_URL: z.string().optional(),
            NEXT_PUBLIC_TWITTER_HANDLE: z.string().optional(),
        },
        runtimeEnv: {
            ANALYZE: process.env.ANALYZE,
            NEXT_RUNTIME: process.env.NEXT_RUNTIME,
            VERCEL: process.env.VERCEL,
            VERCEL_ENV: process.env.VERCEL_ENV,
            VERCEL_URL: process.env.VERCEL_URL,
            VERCEL_REGION: process.env.VERCEL_REGION,
            VERCEL_PROJECT_PRODUCTION_URL:
                process.env.VERCEL_PROJECT_PRODUCTION_URL,
            NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
            NEXT_PUBLIC_WEB_URL: process.env.NEXT_PUBLIC_WEB_URL,
            NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
            NEXT_PUBLIC_DOCS_URL: process.env.NEXT_PUBLIC_DOCS_URL,
            NEXT_PUBLIC_DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE,
            NEXT_PUBLIC_PRODUCT_MODE: process.env.NEXT_PUBLIC_PRODUCT_MODE,
            NEXT_PUBLIC_PRIVACY_CONTACT:
                process.env.NEXT_PUBLIC_PRIVACY_CONTACT,
            NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
            NEXT_PUBLIC_APP_LOGO_URL: process.env.NEXT_PUBLIC_APP_LOGO_URL,
            NEXT_PUBLIC_APP_SUPPORT_EMAIL:
                process.env.NEXT_PUBLIC_APP_SUPPORT_EMAIL,
            NEXT_PUBLIC_APP_AUTHOR: process.env.NEXT_PUBLIC_APP_AUTHOR,
            NEXT_PUBLIC_APP_AUTHOR_URL: process.env.NEXT_PUBLIC_APP_AUTHOR_URL,
            NEXT_PUBLIC_TWITTER_HANDLE: process.env.NEXT_PUBLIC_TWITTER_HANDLE,
        },
        skipValidation: true,
    });
