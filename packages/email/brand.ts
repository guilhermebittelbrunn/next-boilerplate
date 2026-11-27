/**
 * Email palette only; the name, logo and support contact come from
 * `@repo/next-config/brand`. Colours are literal hex on purpose: the design system
 * tokens are `oklch()` behind `var()`, and email clients resolve neither.
 */
export const emailBrand = {
    primaryColor: "#2559bf",
    primaryTextColor: "#ffffff",
    backgroundColor: "#f9fafb",
    surfaceColor: "#ffffff",
    borderColor: "#e1e3e7",
    textColor: "#15181f",
    mutedTextColor: "#5f636c",
} as const;
