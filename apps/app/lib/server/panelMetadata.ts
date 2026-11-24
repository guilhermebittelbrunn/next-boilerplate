import { getTranslations } from "@repo/internationalization/server";
import { resolveLocale } from "@repo/internationalization/utils";
import type { Metadata } from "next";
import {
    PANEL_PAGE_TITLES,
    type PanelPageRoute,
} from "@/shared/lib/panelTitles";

type PanelPageMetadataProps = {
    params: Promise<{ locale: string }>;
};

export function panelPageMetadata(route: PanelPageRoute) {
    return async ({ params }: PanelPageMetadataProps): Promise<Metadata> => {
        const { locale } = await params;
        const dictionary = await getTranslations(resolveLocale(locale));

        return { title: PANEL_PAGE_TITLES[route](dictionary) };
    };
}
