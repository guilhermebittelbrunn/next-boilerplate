import type { BillingPlanCountDTO, PlanInterval } from "@repo/sdk/src/types";
import { toBcp47Locale } from "./formatPlanPrice";

/** The design system ships five chart colours, and the axis never hides a label. */
export const MAX_CHART_PLANS = 5;

/**
 * The axis shows every label, so a long plan name would overlap its neighbour. At a 320 px
 * viewport the five tick centres sit about 38 px apart, and at the 12 px chart font a
 * six-character label such as "Empre…" is 43 px wide (about 7.2 px per character), which
 * runs into the next one. Five characters stay near 36 px. The full name lives in the list
 * under the chart.
 */
export const PLAN_AXIS_LABEL_MAX_CHARS = 5;

const ELLIPSIS = "…";

export type PlanChartCopy = {
    unnamed: string;
    other: string;
};

export type PlanChartEntry = {
    key: string;
    color: string;
    name: string;
    axisLabel: string;
    count: number;
    /** Null for the bar that groups every plan past the fourth. */
    plan: BillingPlanCountDTO | null;
};

export function truncateAxisLabel(
    label: string,
    maxChars = PLAN_AXIS_LABEL_MAX_CHARS
): string {
    const characters = Array.from(label);
    if (characters.length <= maxChars) {
        return label;
    }
    return `${characters
        .slice(0, maxChars - 1)
        .join("")
        .trimEnd()}${ELLIPSIS}`;
}

type EntryInput = Pick<PlanChartEntry, "key" | "name" | "count" | "plan"> & {
    position: number;
};

function toEntry({ position, ...entry }: EntryInput): PlanChartEntry {
    return {
        ...entry,
        color: `var(--chart-${position + 1})`,
        axisLabel: truncateAxisLabel(entry.name),
    };
}

/**
 * Keys are positional (`plan0`, `other`) because the chart turns each key into a CSS
 * custom property name, and a provider price id is not guaranteed to be a valid one.
 */
export function buildPlanChartEntries(
    plans: BillingPlanCountDTO[],
    copy: PlanChartCopy
): PlanChartEntry[] {
    const planEntry = (plan: BillingPlanCountDTO, position: number) =>
        toEntry({
            key: `plan${position}`,
            position,
            name: plan.name ?? copy.unnamed,
            count: plan.count,
            plan,
        });

    if (plans.length <= MAX_CHART_PLANS) {
        return plans.map(planEntry);
    }

    const shown = plans.slice(0, MAX_CHART_PLANS - 1);
    const grouped = plans.slice(MAX_CHART_PLANS - 1);

    return [
        ...shown.map(planEntry),
        toEntry({
            key: "other",
            position: MAX_CHART_PLANS - 1,
            name: copy.other,
            count: grouped.reduce((sum, plan) => sum + plan.count, 0),
            plan: null,
        }),
    ];
}

export type PlanIntervalCopy = {
    interval: Record<PlanInterval, string>;
    everyInterval: string;
    intervalUnits: Record<PlanInterval, string>;
};

export function describePlanInterval(
    copy: PlanIntervalCopy,
    interval: PlanInterval | null,
    intervalCount: number | null
): string | null {
    if (!interval) {
        return null;
    }
    const count = intervalCount ?? 1;
    if (count === 1) {
        return copy.interval[interval];
    }
    return copy.everyInterval
        .replace("{count}", String(count))
        .replace("{unit}", copy.intervalUnits[interval]);
}

/**
 * The timezone is fixed to UTC because the server renders this page from the prefetched
 * data and the browser hydrates it: in their own timezones they would print a different
 * day, or month, around midnight.
 */
function formatUtc(
    iso: string,
    locale: string,
    options: Intl.DateTimeFormatOptions
): string | null {
    const instant = new Date(iso);
    if (Number.isNaN(instant.getTime())) {
        return null;
    }
    return new Intl.DateTimeFormat(toBcp47Locale(locale), {
        ...options,
        timeZone: "UTC",
    }).format(instant);
}

export function formatUtcMonth(iso: string, locale: string): string | null {
    return formatUtc(iso, locale, { month: "long", year: "numeric" });
}

export function formatUtcDate(iso: string, locale: string): string | null {
    return formatUtc(iso, locale, { dateStyle: "medium" });
}
