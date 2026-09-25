import { normalizeFirestoreInstant } from "@repo/shared/utils";
import db from "../infra/database";
import { isAlreadyExistsError } from "../infra/firestore-errors";
import type { PaidInvoiceRecord } from "../lib/billing-state";
import { BaseRepository } from "./base.repository";

export type PaidInvoiceRow = {
    id: string;
    amountPaid: number;
    currency: string;
    paidAt: string;
    billingReason: string | null;
    subscriptionId: string | null;
    priceId: string | null;
};

export type PaidAmount = { amountPaid: number; currency: string };

function toPaidAmount(raw: Record<string, unknown>): PaidAmount {
    return {
        amountPaid: typeof raw.amountPaid === "number" ? raw.amountPaid : 0,
        currency: typeof raw.currency === "string" ? raw.currency : "",
    };
}

/**
 * One document per paid invoice, keyed by the invoice id, so a handler that runs twice for
 * the same invoice cannot count it twice. It holds no customer or profile reference: the
 * revenue does not need to know whose money it was.
 */
class PaidInvoiceRepository extends BaseRepository<PaidInvoiceRow> {
    constructor() {
        super(db, "paidInvoice");
    }

    async recordOnce(record: PaidInvoiceRecord): Promise<"created" | "exists"> {
        try {
            await this.db.collection(this.table).doc(record.invoiceId).create({
                amountPaid: record.amountPaid,
                currency: record.currency,
                paidAt: record.paidAt,
                billingReason: record.billingReason,
                subscriptionId: record.subscriptionId,
                priceId: record.priceId,
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

    /** `[start, end)` on a single field, which the automatic index serves. */
    async listPaidBetween(start: Date, end: Date): Promise<PaidAmount[]> {
        const snapshot = await this.db
            .collection(this.table)
            .where("paidAt", ">=", start)
            .where("paidAt", "<", end)
            .select("amountPaid", "currency")
            .get();

        return snapshot.docs.map((docSnap) =>
            toPaidAmount(docSnap.data() as Record<string, unknown>)
        );
    }

    async firstPaidAt(): Promise<string | null> {
        const snapshot = await this.db
            .collection(this.table)
            .orderBy("paidAt", "asc")
            .limit(1)
            .select("paidAt")
            .get();

        const first = snapshot.docs[0];
        return first ? normalizeFirestoreInstant(first.data().paidAt) : null;
    }
}

export const paidInvoiceRepository = new PaidInvoiceRepository();
