export type A11yTheme = "light" | "dark";

export type A11yException = {
    /** Route key passed to `expectAccessible`, e.g. "/pt-br/sign-in". */
    route: string;
    /** axe rule id, e.g. "button-name". */
    ruleId: string;
    /** Stable CSS selector the offending element must match. */
    selector: string;
    /** Restricts the exception to one theme; omitted, it applies to both. */
    theme?: A11yTheme;
    /** Why this is tolerated for now, and what fixes it. */
    reason: string;
};

/**
 * Empty on purpose. An entry is only acceptable for a defect inside a third-party library
 * that this repository cannot fix, and its `reason` links to the upstream issue.
 */
export const A11Y_ALLOWLIST: A11yException[] = [];
