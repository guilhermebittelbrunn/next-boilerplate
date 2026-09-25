import type { PlanInterval } from "@repo/sdk/src/types";
import { normalizeFirestoreInstant, stringIfExists } from "@repo/shared/utils";
import db from "../infra/database";
import type { PlanLabel } from "../lib/billing-state";
import { BaseRepository } from "./base.repository";

export type StoredPlanLabel = PlanLabel & { id: string; resolvedAt: string };

function toStoredPlanLabel(
    id: string,
    raw: Record<string, unknown>
): StoredPlanLabel {
    return {
        id,
        name: stringIfExists(raw.name),
        productId: stringIfExists(raw.productId),
        interval: stringIfExists(raw.interval) as PlanInterval | null,
        intervalCount:
            typeof raw.intervalCount === "number" ? raw.intervalCount : null,
        resolvedAt: normalizeFirestoreInstant(raw.resolvedAt),
    };
}

/** A local copy of each price's display name, keyed by the price id. */
class PlanLabelRepository extends BaseRepository<StoredPlanLabel> {
    constructor() {
        super(db, "planLabel");
    }

    async find(priceId: string): Promise<StoredPlanLabel | null> {
        const snapshot = await this.db
            .collection(this.table)
            .doc(priceId)
            .get();
        if (!snapshot.exists) {
            return null;
        }
        return toStoredPlanLabel(
            snapshot.id,
            snapshot.data() as Record<string, unknown>
        );
    }

    async findByPriceIds(priceIds: string[]): Promise<Map<string, PlanLabel>> {
        const labels = new Map<string, PlanLabel>();
        const unique = [...new Set(priceIds)];
        if (unique.length === 0) {
            return labels;
        }

        const collection = this.db.collection(this.table);
        const snapshots = await this.db.getAll(
            ...unique.map((priceId) => collection.doc(priceId))
        );

        for (const snapshot of snapshots) {
            if (snapshot.exists) {
                const stored = toStoredPlanLabel(
                    snapshot.id,
                    snapshot.data() as Record<string, unknown>
                );
                labels.set(stored.id, {
                    name: stored.name,
                    productId: stored.productId,
                    interval: stored.interval,
                    intervalCount: stored.intervalCount,
                });
            }
        }
        return labels;
    }

    async save(priceId: string, label: PlanLabel): Promise<void> {
        await this.db.collection(this.table).doc(priceId).set({
            name: label.name,
            productId: label.productId,
            interval: label.interval,
            intervalCount: label.intervalCount,
            resolvedAt: new Date(),
        });
    }
}

export const planLabelRepository = new PlanLabelRepository();
