export const LIGHTHOUSE_VERSION = "12.8.2";
export const LOCALES = ["pt-br", "en", "es"];
export const PAGE_PATHS = ["", "/pricing", "/contact"];

const NOT_MEASURED = "not measured";
const PASS = "✅";
const PERCENT = 100;
const MS_PER_SECOND = 1000;
const CLS_DECIMALS = 3;

// Delivery part 3 thresholds for the landing, measured on mobile.
const SCORES = {
    performance: {
        label: "Performance",
        pass: 90,
        bands: [{ min: 50, severity: "🟡" }],
        floor: "🔴",
    },
    accessibility: { label: "Accessibility", pass: 95, bands: [], floor: "🟡" },
    "best-practices": {
        label: "Best practices",
        pass: 95,
        bands: [],
        floor: "🟡",
    },
    seo: { label: "SEO", pass: 95, bands: [], floor: "🟡" },
};

const METRICS = {
    "largest-contentful-paint": {
        label: "LCP",
        under: 2500,
        miss: "🟡",
        format: (ms) => `${(ms / MS_PER_SECOND).toFixed(1)} s`,
    },
    "cumulative-layout-shift": {
        label: "CLS",
        under: 0.1,
        miss: "🟡",
        format: (value) => value.toFixed(CLS_DECIMALS),
    },
    "total-blocking-time": {
        label: "TBT",
        under: 200,
        miss: "🟢",
        format: (ms) => `${Math.round(ms)} ms`,
    },
};

export const CATEGORIES = Object.keys(SCORES);
export const METRIC_AUDITS = Object.keys(METRICS);

const isNumber = (value) => typeof value === "number" && Number.isFinite(value);

/** Pass mark, or the part 3 severity of the miss, for a score (0-100) or a metric. */
export function verdict(key, value) {
    if (!isNumber(value)) {
        return NOT_MEASURED;
    }
    const score = SCORES[key];
    if (score) {
        if (value >= score.pass) {
            return PASS;
        }
        return (
            score.bands.find((band) => value >= band.min)?.severity ??
            score.floor
        );
    }
    const metric = METRICS[key];
    if (!metric) {
        throw new Error(`No threshold for ${key}`);
    }
    return value < metric.under ? PASS : metric.miss;
}

/** Scores (0-100) and metrics from a Lighthouse JSON report; anything unmeasured is null. */
export function summarizeReport(report) {
    const runtimeError = report?.runtimeError?.message ?? null;
    const scores = Object.fromEntries(
        CATEGORIES.map((category) => {
            const score = report?.categories?.[category]?.score;
            return [
                category,
                !runtimeError && isNumber(score)
                    ? Math.round(score * PERCENT)
                    : null,
            ];
        })
    );
    const metrics = Object.fromEntries(
        METRIC_AUDITS.map((id) => {
            const audit = report?.audits?.[id];
            const value = audit?.numericValue;
            return [
                id,
                !(runtimeError || audit?.errorMessage) && isNumber(value)
                    ? value
                    : null,
            ];
        })
    );
    return {
        url: report?.finalDisplayedUrl ?? report?.requestedUrl ?? null,
        scores,
        metrics,
        error: runtimeError,
    };
}

/** True only when the report carries every score and metric the table shows. */
export function isComplete(summary) {
    return (
        !summary.error &&
        Object.values(summary.scores).every(isNumber) &&
        Object.values(summary.metrics).every(isNumber)
    );
}

const scoreCell = (category, value) => {
    const mark = verdict(category, value);
    return mark === NOT_MEASURED ? mark : `${value} ${mark}`;
};

const metricCell = (id, value) => {
    const mark = verdict(id, value);
    return mark === NOT_MEASURED
        ? mark
        : `${METRICS[id].format(value)} ${mark}`;
};

const inline = (text) =>
    String(text).replace(/\s+/g, " ").replace(/\|/g, "\\|");

/**
 * Markdown table for the delivery report. A row is `{ path, summary }` when Lighthouse
 * produced a report, or `{ path, failure }` when it did not.
 */
export function renderSummary({ rows, meta }) {
    const columns = [
        ...CATEGORIES.map((category) => SCORES[category].label),
        ...METRIC_AUDITS.map((id) => METRICS[id].label),
    ];
    const server = meta.startedServer
        ? "next start started by the command"
        : "server already running";
    const problems = [];

    const lines = [
        "## Lighthouse (mobile)",
        "",
        `Lighthouse ${meta.version} · ${meta.date} · commit ${meta.commit} · ${meta.baseUrl} (${server})`,
        "",
        `| Page | ${columns.join(" | ")} |`,
        `|------|${columns.map(() => "---").join("|")}|`,
    ];

    for (const row of rows) {
        const summary = row.summary ?? summarizeReport(null);
        const cells = [
            ...CATEGORIES.map((category) =>
                scoreCell(category, summary.scores[category])
            ),
            ...METRIC_AUDITS.map((id) => metricCell(id, summary.metrics[id])),
        ];
        lines.push(`| ${row.path} | ${cells.join(" | ")} |`);

        const problem = row.failure ?? summary.error;
        if (problem) {
            problems.push(`- ${row.path}: ${inline(problem)}`);
        }
    }

    if (problems.length > 0) {
        lines.push("", "Not measured:", "", ...problems);
    }

    return `${lines.join("\n")}\n`;
}
