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

type ExceptionTemplate = Omit<A11yException, "route">;

const forRoutes = (
    routes: readonly string[],
    template: ExceptionTemplate
): A11yException[] => routes.map((route) => ({ route, ...template }));

const PASSWORD_TOGGLE: ExceptionTemplate = {
    ruleId: "button-name",
    selector: "input + button.absolute",
    reason: "The show/hide password button in HookFormInputPassword renders only an icon and has no aria-label. Fix: a translated aria-label in @repo/design-system.",
};

const WEB_BUTTON_WRAPPING_LINK: ExceptionTemplate = {
    ruleId: "nested-interactive",
    selector: "button:has(a, button)",
    reason: "The web header, hero and CTA wrap a Link (and the language switcher a Button) inside a <Button>, so a focusable element sits inside another. Fix: Button asChild around the Link, and the switcher's Button as the trigger itself.",
};

const UNTITLED_PANEL_PAGE: ExceptionTemplate = {
    ruleId: "document-title",
    selector: "html",
    reason: "The authenticated panel pages declare no metadata, so the document has no <title>. Fix: a title in the panel layouts (or per page), read from the dictionary.",
};

const UNNAMED_ROW_SWITCH: ExceptionTemplate = {
    ruleId: "button-name",
    selector: '[data-slot="switch"]',
    reason: "The enabled toggle in each table row (entities, admin users) is a Switch with no label or aria-label. Fix: an aria-label naming the row, from the dictionary.",
};

const UNNAMED_SELECT_TRIGGER: ExceptionTemplate = {
    ruleId: "button-name",
    selector: '[data-slot="select-trigger"]',
    reason: "The panel environment picker, the impersonated-user picker and the admin users filter render the design-system Select without label or aria-label. Fix: pass the existing navbar copy (environmentLabel, selectUserPlaceholder) as aria-label.",
};

const AVATAR_FALLBACK_CONTRAST: ExceptionTemplate = {
    ruleId: "color-contrast",
    selector: '[data-slot="avatar-fallback"]',
    theme: "light",
    reason: "The navbar avatar initials use text-muted-foreground on bg-muted, below 4.5:1 in the light theme. Fix: a foreground token for the fallback in @repo/design-system.",
};

const WEB_MUTED_ON_MUTED_CONTRAST: ExceptionTemplate = {
    ruleId: "color-contrast",
    selector: ".bg-muted .text-muted-foreground",
    theme: "light",
    reason: "The landing feature, testimonial and CTA cards put text-muted-foreground on bg-muted, below 4.5:1 in the light theme. Fix: a darker text token inside the muted cards.",
};

const PANEL_ROUTES = [
    "/pt-br",
    "/pt-br/entities",
    "/pt-br/entities/create",
    "/pt-br/entities/edit/[id]",
    "/pt-br/entities#impersonating",
    "/pt-br/admin",
    "/pt-br/admin/users",
];

const ADMIN_NAVBAR_ROUTES = [
    "/pt-br/entities#impersonating",
    "/pt-br/admin",
    "/pt-br/admin/users",
];

export const A11Y_ALLOWLIST: A11yException[] = [
    ...forRoutes(
        ["/pt-br/sign-in", "/pt-br/sign-up", "web:/pt-br/sign-up"],
        PASSWORD_TOGGLE
    ),
    ...forRoutes(
        ["web:/pt-br", "web:/pt-br/sign-up"],
        WEB_BUTTON_WRAPPING_LINK
    ),
    ...forRoutes(["web:/pt-br"], WEB_MUTED_ON_MUTED_CONTRAST),
    ...forRoutes(PANEL_ROUTES, UNTITLED_PANEL_PAGE),
    ...forRoutes(
        PANEL_ROUTES.filter((route) => route !== "/pt-br/admin/users"),
        AVATAR_FALLBACK_CONTRAST
    ),
    ...forRoutes(ADMIN_NAVBAR_ROUTES, UNNAMED_SELECT_TRIGGER),
    ...forRoutes(
        [
            "/pt-br/entities",
            "/pt-br/entities#impersonating",
            "/pt-br/admin/users",
        ],
        UNNAMED_ROW_SWITCH
    ),
];
