import { describe, expect, it } from "vitest";
import type { A11yException } from "../a11y/allowlist";
import {
    type AxeViolationLike,
    filterViolations,
    formatViolations,
} from "../support/a11yFilter";

const violation = (
    id: string,
    impact: string,
    targets: string[]
): AxeViolationLike => ({
    id,
    impact,
    help: `${id} help`,
    helpUrl: `https://dequeuniversity.com/rules/axe/${id}`,
    nodes: targets.map((target) => ({ target: [target], html: `<${target}>` })),
});

const lightSignIn = { route: "/pt-br/sign-in", theme: "light" as const };

// Stands in for the in-page `element.matches(selector)`: here a target matches only
// the selector spelled exactly like it.
const sameSelector = (target: string, selector: string) => target === selector;

const exception = (overrides: Partial<A11yException> = {}): A11yException => ({
    route: "/pt-br/sign-in",
    ruleId: "button-name",
    selector: "button.toggle",
    reason: "icon-only toggle without a name",
    ...overrides,
});

describe("filterViolations", () => {
    it("ignores minor and moderate violations", () => {
        const { failing } = filterViolations(
            [
                violation("region", "moderate", ["div"]),
                violation("empty-heading", "minor", ["h2"]),
            ],
            lightSignIn,
            [],
            sameSelector
        );

        expect(failing).toEqual([]);
    });

    it("fails on critical and serious violations, one entry per node", () => {
        const { failing } = filterViolations(
            [
                violation("label", "critical", ["#name", "#email"]),
                violation("color-contrast", "serious", ["p.hint"]),
            ],
            lightSignIn,
            [],
            sameSelector
        );

        expect(failing.map((node) => `${node.ruleId} ${node.target}`)).toEqual([
            "label #name",
            "label #email",
            "color-contrast p.hint",
        ]);
    });

    it("tolerates only the route, rule and element an exception names", () => {
        const { failing } = filterViolations(
            [
                violation("button-name", "critical", ["button.toggle"]),
                violation("button-name", "critical", ["button.other"]),
                violation("label", "critical", ["button.toggle"]),
            ],
            lightSignIn,
            [exception()],
            sameSelector
        );

        expect(failing.map((node) => `${node.ruleId} ${node.target}`)).toEqual([
            "button-name button.other",
            "label button.toggle",
        ]);
    });

    it("does not apply an exception written for another route", () => {
        const { failing } = filterViolations(
            [violation("button-name", "critical", ["button.toggle"])],
            { route: "/pt-br/sign-up", theme: "light" },
            [exception()],
            sameSelector
        );

        expect(failing).toHaveLength(1);
    });

    it("scopes a themed exception to that theme", () => {
        const darkOnly = exception({
            ruleId: "color-contrast",
            selector: "p.hint",
            theme: "dark",
        });
        const contrast = [violation("color-contrast", "serious", ["p.hint"])];

        expect(
            filterViolations(
                contrast,
                { ...lightSignIn, theme: "dark" },
                [darkOnly],
                sameSelector
            ).failing
        ).toEqual([]);
        expect(
            filterViolations(contrast, lightSignIn, [darkOnly], sameSelector)
                .failing
        ).toHaveLength(1);
    });

    it("reports an exception that no longer matches as stale", () => {
        const matched = exception();
        const stale = exception({ ruleId: "link-name", selector: "a.gone" });
        const otherRoute = exception({ route: "/pt-br/sign-up" });

        const { failing, staleExceptions } = filterViolations(
            [violation("button-name", "critical", ["button.toggle"])],
            lightSignIn,
            [matched, stale, otherRoute],
            sameSelector
        );

        expect(failing).toEqual([]);
        expect(staleExceptions).toEqual([stale]);
    });
});

describe("formatViolations", () => {
    it("names the rule, route and target of each failing node", () => {
        const { failing } = filterViolations(
            [violation("label", "critical", ["#name"])],
            lightSignIn,
            [],
            sameSelector
        );

        expect(formatViolations(failing)).toContain(
            "[critical] label @ /pt-br/sign-in (light)\n  target: #name"
        );
    });
});

describe("the matcher contract", () => {
    it("asks the matcher about each failing node and the exception selector", () => {
        const asked: string[] = [];
        filterViolations(
            [
                violation("button-name", "critical", ["#_R_generated_"]),
                violation("region", "moderate", ["div"]),
            ],
            lightSignIn,
            [exception({ selector: '[data-slot="switch"]' })],
            (target, selector) => {
                asked.push(`${target} ~ ${selector}`);
                return true;
            }
        );

        expect(asked).toEqual(['#_R_generated_ ~ [data-slot="switch"]']);
    });
});
