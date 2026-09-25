import type { A11yException, A11yTheme } from "../a11y/allowlist";

export const FAILING_IMPACTS: ReadonlySet<string> = new Set([
    "critical",
    "serious",
]);

export type AxeNodeLike = {
    target: readonly unknown[];
    html: string;
    failureSummary?: string;
};

export type AxeViolationLike = {
    id: string;
    impact?: string | null;
    help: string;
    helpUrl: string;
    nodes: readonly AxeNodeLike[];
};

export type A11yScope = { route: string; theme: A11yTheme };

export type FailingA11yNode = {
    route: string;
    theme: A11yTheme;
    ruleId: string;
    impact: string;
    help: string;
    helpUrl: string;
    target: string;
    html: string;
};

/** Answers whether the element axe points at (by its target) matches a CSS selector. */
export type TargetMatcher = (target: string, selector: string) => boolean;

export const axeTarget = (node: AxeNodeLike) =>
    node.target.map((selector) => String(selector)).join(" ");

export const isFailingImpact = (impact?: string | null) =>
    Boolean(impact && FAILING_IMPACTS.has(impact));

export const applicableExceptions = (
    allowlist: readonly A11yException[],
    scope: A11yScope
) =>
    allowlist.filter(
        (exception) =>
            exception.route === scope.route &&
            (exception.theme === undefined || exception.theme === scope.theme)
    );

export const filterViolations = (
    violations: readonly AxeViolationLike[],
    scope: A11yScope,
    allowlist: readonly A11yException[],
    matches: TargetMatcher
) => {
    const candidates = applicableExceptions(allowlist, scope);
    const used = new Set<A11yException>();
    const failing: FailingA11yNode[] = [];

    for (const violation of violations) {
        if (!isFailingImpact(violation.impact)) {
            continue;
        }
        for (const node of violation.nodes) {
            const target = axeTarget(node);
            const exception = candidates.find(
                (candidate) =>
                    candidate.ruleId === violation.id &&
                    matches(target, candidate.selector)
            );
            if (exception) {
                used.add(exception);
                continue;
            }
            failing.push({
                route: scope.route,
                theme: scope.theme,
                ruleId: violation.id,
                impact: violation.impact ?? "",
                help: violation.help,
                helpUrl: violation.helpUrl,
                target,
                html: node.html,
            });
        }
    }

    const staleExceptions = candidates.filter(
        (candidate) => !used.has(candidate)
    );
    return { failing, staleExceptions };
};

export const formatViolations = (failing: readonly FailingA11yNode[]) =>
    failing
        .map(
            (node) =>
                `[${node.impact}] ${node.ruleId} @ ${node.route} (${node.theme})\n  target: ${node.target}\n  ${node.help} (${node.helpUrl})\n  ${node.html}`
        )
        .join("\n\n");
