import { getBrand } from "@repo/next-config/brand";
import merge from "lodash.merge";
import type { Metadata } from "next";

type MetadataGenerator = Omit<Metadata, "description" | "title"> & {
    title: string;
    description: string;
    image?: string;
};

const authorUrl = process.env.NEXT_PUBLIC_APP_AUTHOR_URL;
const twitterHandle = process.env.NEXT_PUBLIC_TWITTER_HANDLE;
const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;

const PROTOCOL_RE = /^https?:\/\//;

/** Tolerates env values with or without a protocol (e.g. Vercel host vs full URL). */
const resolveMetadataBase = (): URL | undefined => {
    if (!productionUrl) {
        return;
    }
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const raw = PROTOCOL_RE.test(productionUrl)
        ? productionUrl
        : `${protocol}://${productionUrl}`;
    try {
        return new URL(raw);
    } catch {
        return;
    }
};

export const createMetadata = ({
    title,
    description,
    image,
    ...properties
}: MetadataGenerator): Metadata => {
    const applicationName = getBrand().name;
    const authorName =
        process.env.NEXT_PUBLIC_APP_AUTHOR?.trim() || applicationName;
    const author: Metadata["authors"] = {
        name: authorName,
        ...(authorUrl ? { url: authorUrl } : {}),
    };
    const parsedTitle = `${title} | ${applicationName}`;
    const defaultMetadata: Metadata = {
        title: parsedTitle,
        description,
        applicationName,
        metadataBase: resolveMetadataBase(),
        authors: [author],
        creator: authorName,
        formatDetection: {
            telephone: false,
        },
        appleWebApp: {
            capable: true,
            statusBarStyle: "default",
            title: parsedTitle,
        },
        openGraph: {
            title: parsedTitle,
            description,
            type: "website",
            siteName: applicationName,
            // Default; callers pass a locale-specific value (e.g. "pt_BR") that
            // overrides this via merge.
            locale: "en_US",
        },
        publisher: authorName,
        twitter: {
            card: "summary_large_image",
            ...(twitterHandle ? { creator: twitterHandle } : {}),
        },
    };

    const metadata: Metadata = merge(defaultMetadata, properties);

    if (image && metadata.openGraph) {
        metadata.openGraph.images = [
            {
                url: image,
                width: 1200,
                height: 630,
                alt: title,
            },
        ];
    }

    return metadata;
};
