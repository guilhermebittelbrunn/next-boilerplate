import { headerTranslations } from "./header";
import { actionMenuTranslations } from "./ui/action-menu";
import { buttonTranslations } from "./ui/button";
import { footerTranslations } from "./ui/footer";
import { scrollToTopTranslations } from "./ui/scroll-to-top";
import { selectTranslations } from "./ui/select";
import { tableTranslations } from "./ui/table";

export const componentsTranslations = {
    "pt-br": {
        header: headerTranslations["pt-br"],
        button: buttonTranslations["pt-br"],
        actionMenu: actionMenuTranslations["pt-br"],
        table: tableTranslations["pt-br"],
        footer: footerTranslations["pt-br"],
        select: selectTranslations["pt-br"],
        scrollToTop: scrollToTopTranslations["pt-br"],
    },
    en: {
        header: headerTranslations.en,
        button: buttonTranslations.en,
        actionMenu: actionMenuTranslations.en,
        table: tableTranslations.en,
        footer: footerTranslations.en,
        select: selectTranslations.en,
        scrollToTop: scrollToTopTranslations.en,
    },
    es: {
        header: headerTranslations.es,
        button: buttonTranslations.es,
        actionMenu: actionMenuTranslations.es,
        table: tableTranslations.es,
        footer: footerTranslations.es,
        select: selectTranslations.es,
        scrollToTop: scrollToTopTranslations.es,
    },
};
