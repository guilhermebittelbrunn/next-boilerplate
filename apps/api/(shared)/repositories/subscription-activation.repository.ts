import db from "../infra/database";
import { isAlreadyExistsError } from "../infra/firestore-errors";
import {
    type SubscriptionActivationRow,
    subscriptionActivationMapper,
} from "../mappers/subscription-activation.mapper";
import { BaseRepository } from "./base.repository";

export type SubscriptionActivationInput = {
    subscriptionId: string;
    customerId: string;
    priceId: string | null;
    activatedAt: Date;
};

/**
 * The first paid invoice of each subscription, keyed by the subscription id. Stripe issues
 * exactly one `subscription_create` invoice per subscription, so creating the document
 * once is enough. The subscriber is resolved at read time through the customer id, which
 * keeps the profile out of this collection.
 */
class SubscriptionActivationRepository extends BaseRepository<SubscriptionActivationRow> {
    constructor() {
        super(db, "subscriptionActivation", subscriptionActivationMapper);
    }

    async recordOnce(
        input: SubscriptionActivationInput
    ): Promise<"created" | "exists"> {
        try {
            await this.db
                .collection(this.table)
                .doc(input.subscriptionId)
                .create({
                    customerId: input.customerId,
                    priceId: input.priceId,
                    activatedAt: input.activatedAt,
                    recordedAt: new Date(),
                });
            return "created";
        } catch (error) {
            if (isAlreadyExistsError(error)) {
                return "exists";
            }
            throw error;
        }
    }

    async listRecent(limit: number): Promise<SubscriptionActivationRow[]> {
        const snapshot = await this.db
            .collection(this.table)
            .orderBy("activatedAt", "desc")
            .limit(limit)
            .get();

        return snapshot.docs.map((docSnap) =>
            this.toDTO(docSnap.id, docSnap.data() as Record<string, unknown>)
        );
    }
}

export const subscriptionActivationRepository =
    new SubscriptionActivationRepository();
