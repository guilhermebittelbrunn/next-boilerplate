import db from "../infra/database";
import { isAlreadyExistsError } from "../infra/firestore-errors";
import { BaseRepository } from "./base.repository";

/** Stripe retries a delivery for up to three days; a month leaves room to spare. */
const RETENTION_DAYS = 30;
const MS_PER_DAY = 86_400_000;

export type PaymentEventRecord = {
    id: string;
    type: string;
    createdAt: Date;
    expiresAt: Date;
};

/**
 * One document per provider event, keyed by the event id, written only after the event
 * was handled. `expiresAt` is there for an optional Firestore TTL policy.
 */
class PaymentEventRepository extends BaseRepository<PaymentEventRecord> {
    constructor() {
        super(db, "paymentEvent");
    }

    async wasProcessed(eventId: string): Promise<boolean> {
        const snapshot = await this.db
            .collection(this.table)
            .doc(eventId)
            .get();
        return snapshot.exists;
    }

    /** A concurrent delivery that already marked the event is the same outcome, not a failure. */
    async markProcessed(event: { id: string; type: string }): Promise<void> {
        const createdAt = new Date();
        try {
            await this.db
                .collection(this.table)
                .doc(event.id)
                .create({
                    type: event.type,
                    createdAt,
                    expiresAt: new Date(
                        createdAt.getTime() + RETENTION_DAYS * MS_PER_DAY
                    ),
                });
        } catch (error) {
            if (isAlreadyExistsError(error)) {
                return;
            }
            throw error;
        }
    }
}

export const paymentEventRepository = new PaymentEventRepository();
