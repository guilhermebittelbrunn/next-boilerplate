import type { AllOptional } from "@repo/shared/utils";
import { normalizeFirestoreInstant, stringIfExists } from "@repo/shared/utils";
import Mapper from "./Mapper";

export type SubscriptionActivationFirestoreRow = Record<string, unknown> & {
    id: string;
};

/** `id` is the provider subscription id. */
export type SubscriptionActivationRow = {
    id: string;
    customerId: string;
    priceId: string | null;
    activatedAt: string;
};

class BaseSubscriptionActivationMapper extends Mapper<
    SubscriptionActivationFirestoreRow,
    SubscriptionActivationRow
> {
    toDTO(
        entity: SubscriptionActivationFirestoreRow
    ): SubscriptionActivationRow {
        const { id, ...raw } = entity;
        const record = raw as Record<string, unknown>;
        return {
            id,
            customerId: String(record.customerId ?? ""),
            priceId: stringIfExists(record.priceId),
            activatedAt: normalizeFirestoreInstant(record.activatedAt),
        };
    }

    toPersistence(
        input: AllOptional<SubscriptionActivationRow>
    ): AllOptional<Record<string, unknown>> {
        const out: Record<string, unknown> = {};
        const keys: (keyof SubscriptionActivationRow)[] = [
            "customerId",
            "priceId",
            "activatedAt",
        ];
        for (const key of keys) {
            if (input[key] !== undefined) {
                out[key as string] = input[key] as unknown;
            }
        }
        return out as AllOptional<Record<string, unknown>>;
    }
}

export const subscriptionActivationMapper =
    new BaseSubscriptionActivationMapper();
