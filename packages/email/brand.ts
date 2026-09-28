/**
 * Email palette only; the name, logo and support contact come from
 * `@repo/next-config/brand`. Colours are literal hex on purpose: the design system
 * tokens are `oklch()` behind `var()`, and email clients resolve neither.
 */
export const emailBrand = {
    primaryColor: "#18181b",
    primaryTextColor: "#ffffff",
    backgroundColor: "#fafafa",
    surfaceColor: "#ffffff",
    borderColor: "#e4e4e7",
    textColor: "#18181b",
    mutedTextColor: "#71717a",
} as const;
