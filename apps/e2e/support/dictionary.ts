import { createRequire } from "node:module";

type GlobalTranslationsModule =
    typeof import("@repo/internationalization/translations/global");

// The translations package ships TypeScript without "type": "module", so Node treats it
// as CommonJS and an ESM named import cannot see its exports. require() goes through
// Playwright's TypeScript loader and returns the real module.
const { globalTranslations } = createRequire(import.meta.url)(
    "@repo/internationalization/translations/global"
) as GlobalTranslationsModule;

export const LOCALE = "pt-br";

export const ptBr = globalTranslations[LOCALE];
