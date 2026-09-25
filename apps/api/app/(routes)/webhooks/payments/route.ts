import type { Stripe } from "@repo/payments";
import { getStripe, getWebhookSecret } from "@repo/payments";
import type { UserDTO } from "@repo/sdk/src/types";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { logEvent } from "@repo/shared/utils/helpers/log";
import { requestIdFrom } from "@repo/shared/utils/helpers/request-id";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import {
    toPaidInvoiceRecord,
    toSubscriptionState,
} from "@/(shared)/lib/billing-state";
import { ensurePlanLabel } from "@/(shared)/lib/plan-label";
import { paidInvoiceRepository } from "@/(shared)/repositories/paid-invoice.repository";
import { paymentEventRepository } from "@/(shared)/repositories/payment-event.repository";
import { subscriptionActivationRepository } from "@/(shared)/repositories/subscription-activation.repository";
import { userRepository } from "@/(shared)/repositories/user.repository";

const idOf = (
    value: string | { id: string } | null | undefined
): string | null => {
    if (!value) {
        return null;
    }
    return typeof value === "string" ? value : value.id;
};

const logProfileNotFound = (eventType: string, requestId: string | null) =>
    logEvent("payments", "webhook-profile-not-found", {
        eventType,
        requestId,
    });

async function linkCheckoutCustomer(
    session: Stripe.Checkout.Session,
    requestId: string | null
): Promise<void> {
    const customerId = idOf(session.customer);
    const profileId =
        session.client_reference_id ?? session.metadata?.profileId ?? null;

    if (!(customerId && profileId)) {
        return;
    }

    const profile = await userRepository.findById(profileId);
    if (!profile) {
        logProfileNotFound("checkout.session.completed", requestId);
        return;
    }

    if (!profile.stripeCustomerId) {
        await userRepository.linkStripeCustomer(profile.id, customerId);
    }
}

async function findSubscriptionOwner(
    subscription: Stripe.Subscription
): Promise<UserDTO | null> {
    const customerId = idOf(subscription.customer);
    const byCustomer = customerId
        ? await userRepository.findByStripeCustomerId(customerId)
        : null;
    if (byCustomer) {
        return byCustomer;
    }

    const profileId = subscription.metadata?.profileId;
    if (!profileId) {
        return null;
    }

    const byMetadata = await userRepository.findById(profileId);
    if (byMetadata && customerId && !byMetadata.stripeCustomerId) {
        await userRepository.linkStripeCustomer(byMetadata.id, customerId);
    }
    return byMetadata;
}

/** The plan name belongs to the price, so it is resolved even when no profile matches. */
async function reconcileSubscription(
    stripe: Stripe,
    event: Stripe.Event,
    subscription: Stripe.Subscription,
    requestId: string | null
): Promise<void> {
    const state = toSubscriptionState(subscription, event.created);
    const profile = await findSubscriptionOwner(subscription);

    if (profile) {
        const result = await userRepository.applySubscriptionState(
            profile.id,
            state,
            event.type
        );
        logEvent("payments", "webhook-subscription-reconciled", {
            eventType: event.type,
            result,
            requestId,
        });
    } else {
        logProfileNotFound(event.type, requestId);
    }

    if (state.priceId) {
        await ensurePlanLabel(stripe, state.priceId, requestId);
    }
}

/**
 * Every write is keyed by the invoice or the subscription id, so running this twice for the
 * same invoice (a redelivery after the event failed to be marked, or two concurrent
 * deliveries) leaves the same documents behind. Only the first paid invoice of a
 * subscription counts as a new subscription: a renewal is not a sale.
 */
async function recordPaidInvoice(
    stripe: Stripe,
    event: Stripe.Event,
    invoice: Stripe.Invoice,
    requestId: string | null
): Promise<void> {
    const record = toPaidInvoiceRecord(invoice, event.created);
    await paidInvoiceRepository.recordOnce(record);

    if (
        record.billingReason === "subscription_create" &&
        record.subscriptionId &&
        record.customerId
    ) {
        await subscriptionActivationRepository.recordOnce({
            subscriptionId: record.subscriptionId,
            customerId: record.customerId,
            priceId: record.priceId,
            activatedAt: record.paidAt,
        });
    }

    if (record.priceId) {
        await ensurePlanLabel(stripe, record.priceId, requestId);
    }

    logEvent("payments", "webhook-invoice-recorded", {
        eventType: event.type,
        billingReason: record.billingReason,
        requestId,
    });
}

async function dispatch(
    stripe: Stripe,
    event: Stripe.Event,
    requestId: string | null
): Promise<void> {
    switch (event.type) {
        case "checkout.session.completed": {
            await linkCheckoutCustomer(event.data.object, requestId);
            break;
        }
        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
            await reconcileSubscription(
                stripe,
                event,
                event.data.object,
                requestId
            );
            break;
        }
        case "invoice.paid": {
            await recordPaidInvoice(
                stripe,
                event,
                event.data.object,
                requestId
            );
            break;
        }
        default: {
            logEvent("payments", "webhook-unhandled-event", {
                eventType: event.type,
            });
        }
    }
}

const failure = () =>
    NextResponse.json(
        { message: "something went wrong", ok: false },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );

/**
 * Answering 503 while unconfigured makes Stripe keep retrying for up to three days, so no
 * event is lost while a fork finishes setting up. An event is marked processed only after
 * its handler finished: a failure answers 500 and Stripe delivers it again.
 */
export const POST = async (request: Request): Promise<Response> => {
    const stripe = getStripe();
    const secret = getWebhookSecret();

    if (!(stripe && secret)) {
        return NextResponse.json(
            { error: { code: "PAYMENTS_NOT_CONFIGURED" } },
            { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
        );
    }

    const requestId = requestIdFrom(request);

    let event: Stripe.Event;
    try {
        const body = await request.text();
        const headerPayload = await headers();
        const signature = headerPayload.get("stripe-signature");

        if (!signature) {
            throw new Error("missing stripe-signature header");
        }

        event = stripe.webhooks.constructEvent(body, signature, secret);
    } catch {
        logEvent("payments", "webhook-failed", { requestId });
        return failure();
    }

    try {
        if (await paymentEventRepository.wasProcessed(event.id)) {
            return NextResponse.json({ ok: true, duplicate: true });
        }

        await dispatch(stripe, event, requestId);
        await paymentEventRepository.markProcessed(event);
    } catch {
        logEvent("payments", "webhook-handler-failed", {
            eventType: event.type,
            requestId,
        });
        return failure();
    }

    return NextResponse.json({ ok: true });
};
