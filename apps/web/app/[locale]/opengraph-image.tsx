import { locales } from "@repo/internationalization/utils";
import { ImageResponse } from "next/og";
import {
    loadBrandLogo,
    OPEN_GRAPH_IMAGE_SIZE,
    resolveOpenGraphCard,
} from "@/shared/lib/openGraph";

export const size = OPEN_GRAPH_IMAGE_SIZE;
export const contentType = "image/png";

const LOGO_SIZE = 112;

// The image renderer understands neither `oklch()` nor CSS variables, so these are hex
// copies of the light theme tokens in the design system's globals.css.
const CARD_COLORS = {
    background: "#ffffff",
    foreground: "#0a0a0a",
    muted: "#525252",
    monogram: "#171717",
    monogramText: "#ffffff",
} as const;

export function generateStaticParams() {
    return locales.map((locale) => ({ locale }));
}

function Monogram({ letter }: { letter: string }) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: LOGO_SIZE,
                height: LOGO_SIZE,
                borderRadius: 24,
                background: CARD_COLORS.monogram,
                color: CARD_COLORS.monogramText,
                fontSize: 64,
            }}
        >
            {letter}
        </div>
    );
}

export default async function OpenGraphImage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const card = resolveOpenGraphCard(locale);
    const logo = await loadBrandLogo(card.logoUrl);

    return new ImageResponse(
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                width: "100%",
                height: "100%",
                padding: 96,
                gap: 40,
                background: CARD_COLORS.background,
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
                {logo ? (
                    // biome-ignore lint/performance/noImgElement: rendered to a PNG by next/og, never by a browser
                    <img
                        alt=""
                        height={LOGO_SIZE}
                        src={logo}
                        style={{ objectFit: "contain" }}
                        width={LOGO_SIZE}
                    />
                ) : (
                    <Monogram letter={card.brandName.charAt(0).toUpperCase()} />
                )}
                <span style={{ fontSize: 72, color: CARD_COLORS.foreground }}>
                    {card.brandName}
                </span>
            </div>
            <span
                style={{
                    fontSize: 40,
                    lineHeight: 1.3,
                    color: CARD_COLORS.muted,
                }}
            >
                {card.tagline}
            </span>
        </div>,
        size
    );
}
