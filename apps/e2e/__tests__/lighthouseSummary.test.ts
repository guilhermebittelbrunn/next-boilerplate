/** biome-ignore-all lint/style/noMagicNumbers: the numbers are the threshold boundaries under test, and naming each one would hide the value being asserted. */
import { describe, expect, it } from "vitest";
import {
    CATEGORIES,
    isComplete,
    LIGHTHOUSE_VERSION,
    METRIC_AUDITS,
    renderSummary,
    summarizeReport,
    verdict,
} from "../lighthouse/summary.mjs";

const report = (overrides: Record<string, unknown> = {}) => ({
    finalDisplayedUrl: "http://localhost:3001/pt-br",
    categories: Object.fromEntries(
        CATEGORIES.map((category) => [category, { score: 0.97 }])
    ),
    audits: {
        "largest-contentful-paint": { numericValue: 1800 },
        "cumulative-layout-shift": { numericValue: 0.01 },
        "total-blocking-time": { numericValue: 120 },
    },
    ...overrides,
});

const meta = {
    version: LIGHTHOUSE_VERSION,
    date: "2026-11-23T10:00:00.000Z",
    commit: "a391d1c",
    baseUrl: "http://localhost:3001",
    startedServer: true,
};

const tableRow = (markdown: string, path: string) =>
    markdown.split("\n").find((line) => line.startsWith(`| ${path} |`));

describe("lighthouse verdicts", () => {
    it.each([
        [90, "✅"],
        [89, "🟡"],
        [50, "🟡"],
        [49, "🔴"],
    ])("scores performance %d as %s", (score, expected) => {
        expect(verdict("performance", score)).toBe(expected);
    });

    it.each(["accessibility", "best-practices", "seo"])(
        "passes %s at 95 and flags 94 as 🟡",
        (category) => {
            expect(verdict(category, 95)).toBe("✅");
            expect(verdict(category, 94)).toBe("🟡");
        }
    );

    it.each([
        ["largest-contentful-paint", 2499, "✅"],
        ["largest-contentful-paint", 2500, "🟡"],
        ["cumulative-layout-shift", 0.099, "✅"],
        ["cumulative-layout-shift", 0.1, "🟡"],
        ["total-blocking-time", 199, "✅"],
        ["total-blocking-time", 200, "🟢"],
    ])("rates %s = %d as %s", (metric, value, expected) => {
        expect(verdict(metric, value)).toBe(expected);
    });

    it("never passes a value that was not measured", () => {
        expect(verdict("performance", null)).toBe("not measured");
        expect(verdict("total-blocking-time", undefined)).toBe("not measured");
    });
});

describe("lighthouse report summary", () => {
    it("reads scores as 0-100 and metrics in their own unit", () => {
        const summary = summarizeReport(report());

        expect(summary.scores).toEqual({
            performance: 97,
            accessibility: 97,
            "best-practices": 97,
            seo: 97,
        });
        expect(summary.metrics["largest-contentful-paint"]).toBe(1800);
        expect(isComplete(summary)).toBe(true);
    });

    it("treats a category with a null score as not measured", () => {
        const summary = summarizeReport(
            report({
                categories: {
                    ...report().categories,
                    performance: { score: null },
                },
            })
        );

        expect(summary.scores.performance).toBeNull();
        expect(isComplete(summary)).toBe(false);
    });

    it("discards every number of a report that ended in a runtime error", () => {
        const summary = summarizeReport(
            report({
                runtimeError: {
                    code: "NO_FCP",
                    message: "The page did not paint any content.",
                },
            })
        );

        expect(Object.values(summary.scores).every((v) => v === null)).toBe(
            true
        );
        expect(Object.values(summary.metrics).every((v) => v === null)).toBe(
            true
        );
        expect(summary.error).toBe("The page did not paint any content.");
        expect(isComplete(summary)).toBe(false);
    });

    it("discards a metric whose audit errored", () => {
        const summary = summarizeReport(
            report({
                audits: {
                    ...report().audits,
                    "total-blocking-time": {
                        numericValue: 0,
                        errorMessage: "Trace failed",
                    },
                },
            })
        );

        expect(summary.metrics["total-blocking-time"]).toBeNull();
    });
});

describe("lighthouse markdown table", () => {
    it("states what was measured, where and with which version", () => {
        const markdown = renderSummary({ rows: [], meta });

        expect(markdown).toContain(`Lighthouse ${LIGHTHOUSE_VERSION}`);
        expect(markdown).toContain(meta.date);
        expect(markdown).toContain("commit a391d1c");
        expect(markdown).toContain(
            "http://localhost:3001 (next start started by the command)"
        );
        expect(
            renderSummary({ rows: [], meta: { ...meta, startedServer: false } })
        ).toContain("(server already running)");
    });

    it("has one column per category and metric, each value with its verdict", () => {
        const markdown = renderSummary({
            rows: [
                {
                    path: "/pt-br",
                    summary: summarizeReport(
                        report({
                            categories: {
                                performance: { score: 0.71 },
                                accessibility: { score: 0.98 },
                                "best-practices": { score: 1 },
                                seo: { score: 0.94 },
                            },
                            audits: {
                                "largest-contentful-paint": {
                                    numericValue: 4100,
                                },
                                "cumulative-layout-shift": {
                                    numericValue: 0.002,
                                },
                                "total-blocking-time": { numericValue: 310 },
                            },
                        })
                    ),
                },
            ],
            meta,
        });

        expect(markdown).toContain(
            "| Page | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT |"
        );
        expect(tableRow(markdown, "/pt-br")).toBe(
            "| /pt-br | 71 🟡 | 98 ✅ | 100 ✅ | 94 🟡 | 4.1 s 🟡 | 0.002 ✅ | 310 ms 🟢 |"
        );
        expect(markdown).not.toContain("Not measured:");
    });

    it("keeps a failed page in the table without a single ✅ and says why", () => {
        const markdown = renderSummary({
            rows: [
                {
                    path: "/pt-br/contact",
                    failure: "lighthouse exited | code 1",
                },
            ],
            meta,
        });

        const row = tableRow(markdown, "/pt-br/contact") ?? "";
        expect(row).not.toContain("✅");
        expect(row.match(/not measured/g)).toHaveLength(
            CATEGORIES.length + METRIC_AUDITS.length
        );
        expect(markdown).toContain(
            "- /pt-br/contact: lighthouse exited \\| code 1"
        );
    });
});
