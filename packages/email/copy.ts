import { globalTranslations } from "@repo/internationalization/translations/global";
import type { Locale } from "@repo/internationalization/utils";

export type EmailCopy =
    (typeof globalTranslations)["pt-br"]["packages"]["email"];

export const emailCopy = (locale: Locale): EmailCopy =>
    globalTranslations[locale].packages.email;
