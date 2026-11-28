// The theme-color meta tag cannot read CSS variables, so these mirror --background from
// styles/globals.css by hand; the contrast test fails when the two drift apart.
export const themeColor = [
    { media: "(prefers-color-scheme: light)", color: "#f9fafb" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0e12" },
];
