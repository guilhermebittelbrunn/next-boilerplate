"use server";

import { cookies } from "next/headers";
import { globalTranslations } from "./translations/global";
import { getDefaultLocale, IGetDictionaryResponse, locales } from "./utils";

type Locale = typeof locales[number];

export async function getDictionary(): Promise<IGetDictionaryResponse> {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('x-locale')?.value;

  if (localeCookie && locales.includes(localeCookie as Locale)) {
    return {dictionary: globalTranslations[localeCookie as Locale], locale: localeCookie as Locale};
  }

  const defaultLocale = getDefaultLocale();

  return {dictionary: globalTranslations[defaultLocale as Locale], locale: defaultLocale as Locale};
}