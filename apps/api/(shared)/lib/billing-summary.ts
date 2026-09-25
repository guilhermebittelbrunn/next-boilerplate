import type {
    BillingActivationDTO,
    BillingPlanCountDTO,
    BillingRevenueByCurrencyDTO,
    BillingSubscriberDTO,
    BillingSummaryDataDTO,
} from "@repo/sdk/src/types";
import type { SubscriptionActivationRow } from "../mappers/subscription-activation.mapper";
import {
    type PaidAmount,
    paidInvoiceRepository,
} from "../repositories/paid-invoice.repository";
import { planLabelRepository } from "../repositories/plan-label.repository";
import { subscriptionActivationRepository } from "../repositories/subscription-activation.repository";
import {
    type LivePlanCount,
    userRepository,
} from "../repositories/user.repository";
import type { PlanLabel } from "./billing-state";

export const RECENT_ACTIVATIONS_LIMIT = 5;

/**
 * The calendar month is closed in UTC so the server-rendered page and the browser agree on
 * which invoices belong to it, whatever timezone either of them runs in.
 */
export function utcMonthRange(now: Date): { start: Date; end: Date } {
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    return {
        start: new Date(Date.UTC(year, month, 1)),
        end: new Date(Date.UTC(year, month + 1, 1)),
    };
}

/** Amounts in different currencies are never added together: there is no conversion. */
export function sumByCurrency(
    rows: PaidAmount[]
): BillingRevenueByCurrencyDTO[] {
    const totals = new Map<string, BillingRevenueByCurrencyDTO>();

    for (const row of rows) {
        const currency = row.currency.toLowerCase();
        const current = totals.get(currency) ?? {
            currency,
            amountPaid: 0,
            invoiceCount: 0,
        };
        current.amountPaid += row.amountPaid;
        current.invoiceCount += 1;
        totals.set(currency, current);
    }

    return [...totals.values()].sort(
        (a, b) =>
            b.amountPaid - a.amountPaid || a.currency.localeCompare(b.currency)
    );
}

function compareNamedFirst(a: string | null, b: string | null): number {
    if (a === b) {
        return 0;
    }
    if (a === null) {
        return 1;
    }
    if (b === null) {
        return -1;
    }
    return a.localeCompare(b);
}

export function rankPlanCounts(
    counts: LivePlanCount[],
    labels: Map<string, PlanLabel>
): BillingPlanCountDTO[] {
    return counts
        .map((count) => {
            const label = count.priceId ? labels.get(count.priceId) : undefined;
            return {
                priceId: count.priceId,
                productId: label?.productId ?? count.productId,
                name: label?.name ?? null,
                interval: label?.interval ?? count.interval,
                intervalCount: label?.intervalCount ?? count.intervalCount,
                count: count.count,
            };
        })
        .sort(
            (a, b) =>
                b.count - a.count ||
                compareNamedFirst(a.name, b.name) ||
                (a.priceId ?? "").localeCompare(b.priceId ?? "")
        );
}

export function toActivationDTO(
    activation: SubscriptionActivationRow,
    labels: Map<string, PlanLabel>,
    subscribers: Map<string, BillingSubscriberDTO>
): BillingActivationDTO {
    const label = activation.priceId
        ? labels.get(activation.priceId)
        : undefined;

    return {
        subscriptionId: activation.id,
        priceId: activation.priceId,
        planName: label?.name ?? null,
        interval: label?.interval ?? null,
        intervalCount: label?.intervalCount ?? null,
        activatedAt: activation.activatedAt,
        subscriber: subscribers.get(activation.customerId) ?? null,
    };
}

export async function buildBillingSummary(
    now: Date
): Promise<BillingSummaryDataDTO> {
    const month = utcMonthRange(now);

    const [activations, planCounts, monthRows, trackingSince] =
        await Promise.all([
            subscriptionActivationRepository.listRecent(
                RECENT_ACTIVATIONS_LIMIT
            ),
            userRepository.countLiveSubscriptionsByPrice(),
            paidInvoiceRepository.listPaidBetween(month.start, month.end),
            paidInvoiceRepository.firstPaidAt(),
        ]);

    const priceIds = [...planCounts, ...activations]
        .map((row) => row.priceId)
        .filter((priceId): priceId is string => Boolean(priceId));

    const [labels, subscribers] = await Promise.all([
        planLabelRepository.findByPriceIds(priceIds),
        userRepository.identifyByStripeCustomerIds(
            activations.map((activation) => activation.customerId)
        ),
    ]);

    return {
        recentActivations: activations.map((activation) =>
            toActivationDTO(activation, labels, subscribers)
        ),
        plans: rankPlanCounts(planCounts, labels),
        revenue: {
            periodStart: month.start.toISOString(),
            periodEnd: month.end.toISOString(),
            byCurrency: sumByCurrency(monthRows),
            trackingSince,
        },
    };
}
