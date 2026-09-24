const BCP47_BY_LOCALE: Record<string, string> = {
    "pt-br": "pt-BR",
    en: "en",
    es: "es",
};

export function toBcp47Locale(locale: string): string {
    return BCP47_BY_LOCALE[locale] ?? "en";
}

/**
 * Stripe sends amounts in the smallest unit of the currency, and that unit is not always
 * a hundredth: JPY has none. The exponent comes from the formatter itself, so a
 * zero-decimal currency is never divided by 100.
 */
export function formatPlanPrice(
    unitAmount: number | null,
    currency: string | null,
    locale: string
): string | null {
    if (unitAmount == null || !currency) {
        return null;
    }

    let formatter: Intl.NumberFormat;
    try {
        formatter = new Intl.NumberFormat(toBcp47Locale(locale), {
            style: "currency",
            currency: currency.toUpperCase(),
        });
    } catch {
        return null;
    }

    const exponent = formatter.resolvedOptions().maximumFractionDigits ?? 2;
    return formatter.format(unitAmount / 10 ** exponent);
}

type PlanInterval = "day" | "week" | "month" | "year";

export type PlanPriceCopy = {
    pricePerInterval: string;
    pricePerIntervals: string;
    interval: Record<PlanInterval, { one: string; other: string }>;
};

export function describePlanPrice(
    copy: PlanPriceCopy,
    input: {
        unitAmount: number | null;
        currency: string | null;
        interval: PlanInterval | null;
        intervalCount: number | null;
    },
    locale: string
): string | null {
    const price = formatPlanPrice(input.unitAmount, input.currency, locale);
    if (!(price && input.interval)) {
        return price;
    }

    const count = input.intervalCount ?? 1;
    const unit = copy.interval[input.interval];

    if (count === 1) {
        return copy.pricePerInterval
            .replace("{price}", price)
            .replace("{interval}", unit.one);
    }

    return copy.pricePerIntervals
        .replace("{price}", price)
        .replace("{count}", String(count))
        .replace("{interval}", unit.other);
}

export function formatPeriodEnd(iso: string, locale: string): string | null {
    const instant = new Date(iso);
    if (Number.isNaN(instant.getTime())) {
        return null;
    }
    return new Intl.DateTimeFormat(toBcp47Locale(locale), {
        dateStyle: "long",
    }).format(instant);
}
