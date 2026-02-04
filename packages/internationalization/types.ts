import { type blogTranslations } from "./translations/apps/web/pages/blog";
import { type contactTranslations } from "./translations/apps/web/pages/contact/contact";
import { type globalTranslations } from "./translations/global";
import { type headerTranslations } from "./translations/components/header";
import { type homeTranslations } from "./translations/apps/web/pages/home/home";

export type Dictionary = {
  web: {
    header: typeof headerTranslations.en;
    global: typeof globalTranslations.en;
    home: typeof homeTranslations.en;
    contact: typeof contactTranslations.en;
    blog: typeof blogTranslations.en;
  };
};


