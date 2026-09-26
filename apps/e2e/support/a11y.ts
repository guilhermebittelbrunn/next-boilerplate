import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type TestInfo } from "@playwright/test";
import { A11Y_ALLOWLIST, type A11yTheme } from "../a11y/allowlist";
import {
    type AxeViolationLike,
    applicableExceptions,
    axeTarget,
    filterViolations,
    formatViolations,
    isFailingImpact,
} from "./a11yFilter";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const DARK_CLASS = /(^|\s)dark(\s|$)/;
const NON_EMPTY = /\S/;
const TITLE_RULE = "document-title";

const currentTheme = async (page: Page): Promise<A11yTheme> =>
    (await page.evaluate(
        () => window.matchMedia("(prefers-color-scheme: dark)").matches
    ))
        ? "dark"
        : "light";

const matchKey = (target: string, selector: string) =>
    JSON.stringify([target, selector]);

/**
 * axe builds its target from classes and generated ids, which change with any styling
 * edit. Exceptions describe the element with a hand-written selector instead, checked
 * against the element axe reported while the page is still in that state.
 */
const resolveMatches = async (
    page: Page,
    violations: readonly AxeViolationLike[],
    selectors: readonly string[]
) => {
    const targets = violations
        .filter((violation) => isFailingImpact(violation.impact))
        .flatMap((violation) => violation.nodes.map(axeTarget));
    if (targets.length === 0 || selectors.length === 0) {
        return new Set<string>();
    }
    const pairs = await page.evaluate(
        ({ targetList, selectorList }) =>
            targetList.flatMap((target) => {
                const element = document.querySelector(target);
                return selectorList
                    .filter((selector) => element?.matches(selector))
                    .map((selector) => [target, selector]);
            }),
        { targetList: [...new Set(targets)], selectorList: [...selectors] }
    );
    return new Set(
        pairs.map(([target, selector]) => matchKey(target, selector))
    );
};

export async function expectAccessible(
    page: Page,
    testInfo: TestInfo,
    { route }: { route: string }
) {
    const theme = await currentTheme(page);
    // next-themes applies the class after hydration; scanning earlier would measure
    // the light palette while the test claims to check the dark one.
    if (theme === "dark") {
        await expect(page.locator("html")).toHaveClass(DARK_CLASS);
    }

    const scope = { route, theme };
    const exceptions = applicableExceptions(A11Y_ALLOWLIST, scope);
    // Next streams async generateMetadata after the page body on client-side
    // navigation, so the page can be visible while <title> is still missing.
    if (!exceptions.some((exception) => exception.ruleId === TITLE_RULE)) {
        await expect(page).toHaveTitle(NON_EMPTY);
    }

    const results = await new AxeBuilder({ page })
        .withTags(WCAG_TAGS)
        .analyze();
    const selectors = exceptions.map((exception) => exception.selector);
    const matched = await resolveMatches(page, results.violations, selectors);
    const { failing, staleExceptions } = filterViolations(
        results.violations,
        scope,
        A11Y_ALLOWLIST,
        (target, selector) => matched.has(matchKey(target, selector))
    );

    await testInfo.attach(`axe ${route} (${theme})`, {
        body: JSON.stringify(results.violations, null, 2),
        contentType: "application/json",
    });
    for (const entry of staleExceptions) {
        testInfo.annotations.push({
            type: "a11y-stale-exception",
            description: `${entry.ruleId} @ ${entry.route} → ${entry.selector}`,
        });
    }

    expect.soft(failing, formatViolations(failing)).toEqual([]);
}
