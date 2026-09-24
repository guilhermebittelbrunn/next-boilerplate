import { StripeAgentToolkit } from "@stripe/agent-toolkit/ai-sdk";
import { keys } from "./keys";

/**
 * Built on demand, like `getStripe()`: the toolkit constructs a Stripe client that throws
 * on an empty key, so building it at module load would break any import of this file in
 * an environment without Stripe.
 */
export const getPaymentsAgentToolkit = (): StripeAgentToolkit | null => {
    const secretKey = keys().STRIPE_SECRET_KEY;

    if (!secretKey) {
        return null;
    }

    return new StripeAgentToolkit({
        secretKey,
        configuration: {
            actions: {
                paymentLinks: {
                    create: true,
                },
                products: {
                    create: true,
                },
                prices: {
                    create: true,
                },
            },
        },
    });
};
