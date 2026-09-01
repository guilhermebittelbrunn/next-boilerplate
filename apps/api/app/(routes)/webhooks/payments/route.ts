/** biome-ignore-all lint/suspicious/useAwait: os handlers de evento são stubs aguardados pelo despacho abaixo; a assinatura async é o contrato que a persistência futura vai preencher. */
import type { Stripe } from "@repo/payments";
import { getStripe } from "@repo/payments";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { env } from "@/env";

const handleCheckoutSessionCompleted = async (
    data: Stripe.Checkout.Session
) => {
    // TODO: Implement user subscription logic with Firebase Auth
    // You can get user info from Firebase using the customer ID
    if (!data.customer) {
        return;
    }
};

const handleSubscriptionScheduleCanceled = async (
    data: Stripe.SubscriptionSchedule
) => {
    // TODO: Implement user unsubscription logic with Firebase Auth
    if (!data.customer) {
        return;
    }
};

export const POST = async (request: Request): Promise<Response> => {
    const stripe = getStripe();

    if (!(stripe && env.STRIPE_WEBHOOK_SECRET)) {
        return NextResponse.json({ message: "Not configured", ok: false });
    }

    try {
        const body = await request.text();
        const headerPayload = await headers();
        const signature = headerPayload.get("stripe-signature");

        if (!signature) {
            throw new Error("missing stripe-signature header");
        }

        const event = stripe.webhooks.constructEvent(
            body,
            signature,
            env.STRIPE_WEBHOOK_SECRET
        );

        switch (event.type) {
            case "checkout.session.completed": {
                await handleCheckoutSessionCompleted(event.data.object);
                break;
            }
            case "subscription_schedule.canceled": {
                await handleSubscriptionScheduleCanceled(event.data.object);
                break;
            }
            default: {
                console.warn(`Unhandled event type ${event.type}`);
            }
        }

        return NextResponse.json({ result: event, ok: true });
    } catch (error) {
        console.error("Webhook error:", error);

        return NextResponse.json(
            {
                message: "something went wrong",
                ok: false,
            },
            { status: 500 }
        );
    }
};
