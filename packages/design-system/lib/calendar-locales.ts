import type { Locale } from "@repo/internationalization/utils";
import type { DayPickerLocale } from "react-day-picker";
import { enUS, es, ptBR } from "react-day-picker/locale";

export const calendarLocales = {
  "pt-br": ptBR,
  en: enUS,
  es,
} satisfies Record<Locale, DayPickerLocale>;
