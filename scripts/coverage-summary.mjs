import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const METRICS = ["lines", "statements", "functions", "branches"];
const PERCENT = 100;
const repoRoot = path.resolve(import.meta.dirname, "..");
const summaryPath = path.join(repoRoot, "coverage", "coverage-summary.json");

if (!existsSync(summaryPath)) {
    process.stderr.write(
        `No ${path.relative(repoRoot, summaryPath)} found. Run \`pnpm coverage\` first.\n`
    );
    process.exit(1);
}

const summary = JSON.parse(readFileSync(summaryPath, "utf8"));

const workspaceOf = (file) => {
    const [scope, name] = path.relative(repoRoot, file).split(path.sep);
    return scope === "apps" || scope === "packages"
        ? `${scope}/${name}`
        : scope;
};

const emptyTotals = () =>
    Object.fromEntries(
        METRICS.map((metric) => [metric, { total: 0, covered: 0 }])
    );

const byWorkspace = new Map();
for (const [file, fileSummary] of Object.entries(summary)) {
    if (file === "total") {
        continue;
    }
    const workspace = workspaceOf(file);
    const totals = byWorkspace.get(workspace) ?? emptyTotals();
    for (const metric of METRICS) {
        totals[metric].total += fileSummary[metric].total;
        totals[metric].covered += fileSummary[metric].covered;
    }
    byWorkspace.set(workspace, totals);
}

const percent = ({ total, covered }) =>
    total === 0 ? "—" : `${((covered / total) * PERCENT).toFixed(2)}%`;

const row = (label, totals) =>
    `| ${label} | ${METRICS.map((metric) => percent(totals[metric])).join(" | ")} |`;

const lines = [
    "## Coverage",
    "",
    "| Workspace | Lines | Statements | Functions | Branches |",
    "|-----------|-------|------------|-----------|----------|",
    ...[...byWorkspace.keys()]
        .sort()
        .map((workspace) => row(workspace, byWorkspace.get(workspace))),
    row("**Total**", summary.total),
    "",
];

process.stdout.write(`${lines.join("\n")}\n`);
