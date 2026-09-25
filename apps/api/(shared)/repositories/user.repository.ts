import { getAuthInstance } from "@repo/auth/server";
import type {
    BillingSubscriberDTO,
    PlanInterval,
    SubscriptionState,
    UserActivitySummaryDTO,
    UserDTO,
    UserSummaryDTO,
} from "@repo/sdk/src/types";
import { LIVE_SUBSCRIPTION_STATUSES, UserType } from "@repo/sdk/src/types";
import db from "../infra/database";
import {
    ACTIVE_WINDOW_DAYS,
    ACTIVITY_WINDOW_MINUTES,
    type ActivityRange,
    buildActivityRecencyRanges,
    INACTIVE_AFTER_DAYS,
} from "../lib/activity-windows";
import { decideSubscriptionWrite } from "../lib/billing-state";
import {
    mergeAuthAndFirestore,
    serializeFirestoreData,
} from "../mappers/user.mapper";
import { BaseRepository } from "./base.repository";

export type LivePlanCount = {
    priceId: string | null;
    productId: string | null;
    interval: PlanInterval | null;
    intervalCount: number | null;
    count: number;
};

const NO_PRICE_KEY = "";

function stringOrNull(value: unknown): string | null {
    return typeof value === "string" && value.length > 0 ? value : null;
}

class UserRepository extends BaseRepository<UserDTO> {
    constructor() {
        super(db, "user");
    }

    async findByReferenceId(referenceId: string): Promise<UserDTO | null> {
        const querySnapshot = await this.db
            .collection(this.table)
            .where("reference_id", "==", referenceId)
            .where("deletedAt", "==", null)
            .get();

        if (querySnapshot.docs.length === 0) {
            return null;
        }

        return {
            ...(querySnapshot.docs[0].data() as UserDTO),
            id: querySnapshot.docs[0].id,
        };
    }

    /**
     * A single-field query, so the automatic index serves it. The soft-delete filter runs
     * in memory: adding it to the query would demand a composite index, and a customer
     * maps to one profile, rarely two.
     */
    async findByStripeCustomerId(customerId: string): Promise<UserDTO | null> {
        const querySnapshot = await this.db
            .collection(this.table)
            .where("stripeCustomerId", "==", customerId)
            .get();

        const live = querySnapshot.docs.find(
            (docSnap) => docSnap.data().deletedAt == null
        );

        return live ? { ...(live.data() as UserDTO), id: live.id } : null;
    }

    async linkStripeCustomer(id: string, customerId: string): Promise<void> {
        await this.update({ id, stripeCustomerId: customerId });
    }

    /**
     * Read and write inside one transaction, so two deliveries racing on the same profile
     * cannot both pass the ordering check against the same stored snapshot.
     */
    applySubscriptionState(
        id: string,
        next: SubscriptionState,
        eventType: string
    ): Promise<"applied" | "skipped" | "missing"> {
        const ref = this.db.collection(this.table).doc(id);

        return this.db.runTransaction(async (transaction) => {
            const snapshot = await transaction.get(ref);
            if (!snapshot.exists) {
                return "missing";
            }

            const decision = decideSubscriptionWrite(
                snapshot.data()?.subscription,
                next,
                eventType
            );
            if (decision.kind === "skip") {
                return "skipped";
            }

            transaction.update(ref, {
                subscription: next,
                updatedAt: new Date(),
            });
            return "applied";
        });
    }

    /**
     * Kept out of `BaseRepository.update` on purpose: that one stamps `updatedAt` alongside
     * whatever it writes, and an access is not an edit of the profile.
     */
    async touchLastAccess(id: string, at: Date): Promise<void> {
        await this.db
            .collection(this.table)
            .doc(id)
            .update({ lastAccessAt: at });
    }

    /**
     * Erases the profile document. The soft delete the admin listing performs keeps the
     * phone, the avatar reference, the preferences and the last access inside it, which
     * is exactly what a request for erasure asks to be gone.
     */
    purgeProfile(id: string): Promise<void> {
        return this.purge(id);
    }

    async list(options?: { type?: UserType }): Promise<UserDTO[]> {
        const users = await this.findAll();
        const scoped = options?.type
            ? users.filter((user) => user.type === options.type)
            : users;

        const merged = await Promise.all(
            scoped.map((user) => this.mergeWithAuthUser(user))
        );

        return merged.filter((user): user is UserDTO => user !== null);
    }

    /**
     * Counts the profiles without joining Firebase Auth. The join is what `list()` uses to
     * drop profiles whose Auth account is gone, and reproducing it here would mean reading
     * every profile — the cost the aggregation exists to avoid. The total can therefore be
     * higher than the number of rows the admin listing shows.
     */
    async summary(): Promise<UserSummaryDTO> {
        const scoped = () =>
            this.db.collection(this.table).where("deletedAt", "==", null);

        const [total, admin, common] = await Promise.all([
            this.countQuery(scoped()),
            this.countQuery(scoped().where("type", "==", UserType.ADMIN)),
            this.countQuery(scoped().where("type", "==", UserType.COMMON)),
        ]);

        return { total, byType: { admin, common } };
    }

    /**
     * A profile that was never stamped has no `lastAccessAt` field, and Firestore leaves a
     * document out of every index that covers a field it does not carry. The `never` bucket
     * is therefore the remainder of the total, not a query of its own.
     */
    async activitySummary(now = new Date()): Promise<UserActivitySummaryDTO> {
        const scoped = () =>
            this.db.collection(this.table).where("deletedAt", "==", null);

        const ranges = buildActivityRecencyRanges(now);
        const inRange = ({ from, to }: ActivityRange) => {
            const lowerBounded = scoped().where("lastAccessAt", ">=", from);
            return to
                ? lowerBounded.where("lastAccessAt", "<", to)
                : lowerBounded;
        };

        const [total, last7Days, from8To30Days, from31To90Days, over90Days] =
            await Promise.all([
                this.countQuery(scoped()),
                this.countQuery(inRange(ranges.last7Days)),
                this.countQuery(inRange(ranges.from8To30Days)),
                this.countQuery(inRange(ranges.from31To90Days)),
                this.countQuery(inRange(ranges.over90Days)),
            ]);

        const stamped = last7Days + from8To30Days + from31To90Days + over90Days;

        return {
            active: last7Days,
            inactive: from31To90Days + over90Days,
            byRecency: {
                last7Days,
                from8To30Days,
                from31To90Days,
                over90Days,
                // The five counts are not transactional: a profile created between the
                // total and the buckets would otherwise drive this below zero.
                never: Math.max(0, total - stamped),
            },
            thresholds: {
                activeDays: ACTIVE_WINDOW_DAYS,
                inactiveDays: INACTIVE_AFTER_DAYS,
                precisionMinutes: ACTIVITY_WINDOW_MINUTES,
            },
        };
    }

    /**
     * Reads one document per live subscription, and only the fields the count needs. The
     * soft-delete filter runs in memory: putting it in the query would demand a composite
     * index next to the `in` on the subscription status.
     */
    async countLiveSubscriptionsByPrice(): Promise<LivePlanCount[]> {
        const snapshot = await this.db
            .collection(this.table)
            .where("subscription.status", "in", [...LIVE_SUBSCRIPTION_STATUSES])
            .select(
                "subscription.priceId",
                "subscription.productId",
                "subscription.interval",
                "subscription.intervalCount",
                "deletedAt"
            )
            .get();

        const byPrice = new Map<string, LivePlanCount>();

        for (const docSnap of snapshot.docs) {
            const raw = docSnap.data() as {
                deletedAt?: unknown;
                subscription?: Record<string, unknown>;
            };
            if (raw.deletedAt != null) {
                continue;
            }

            const subscription = raw.subscription ?? {};
            const priceId = stringOrNull(subscription.priceId);
            const key = priceId ?? NO_PRICE_KEY;
            const current = byPrice.get(key);

            if (current) {
                current.count += 1;
                continue;
            }

            byPrice.set(key, {
                priceId,
                productId: stringOrNull(subscription.productId),
                interval: stringOrNull(
                    subscription.interval
                ) as PlanInterval | null,
                intervalCount:
                    typeof subscription.intervalCount === "number"
                        ? subscription.intervalCount
                        : null,
                count: 1,
            });
        }

        return [...byPrice.values()];
    }

    /**
     * Resolves the people behind a handful of provider customers in one query and one Auth
     * lookup. A customer whose profile was deleted, or whose Auth account is gone, is left
     * out of the map. A transient Admin SDK failure surfaces, as in `mergeWithAuthUser`.
     */
    async identifyByStripeCustomerIds(
        customerIds: string[]
    ): Promise<Map<string, BillingSubscriberDTO>> {
        const subscribers = new Map<string, BillingSubscriberDTO>();
        const unique = [...new Set(customerIds)];
        if (unique.length === 0) {
            return subscribers;
        }

        const snapshot = await this.db
            .collection(this.table)
            .where("stripeCustomerId", "in", unique)
            .select("stripeCustomerId", "reference_id", "deletedAt")
            .get();

        const profileByCustomer = new Map<
            string,
            { profileId: string; uid: string }
        >();
        for (const docSnap of snapshot.docs) {
            const raw = docSnap.data();
            const customerId = stringOrNull(raw.stripeCustomerId);
            const uid = stringOrNull(raw.reference_id);
            if (
                raw.deletedAt != null ||
                !customerId ||
                !uid ||
                profileByCustomer.has(customerId)
            ) {
                continue;
            }
            profileByCustomer.set(customerId, { profileId: docSnap.id, uid });
        }

        if (profileByCustomer.size === 0) {
            return subscribers;
        }

        const { users } = await getAuthInstance().getUsers(
            [...profileByCustomer.values()].map(({ uid }) => ({ uid }))
        );
        const authByUid = new Map(users.map((user) => [user.uid, user]));

        for (const [customerId, { profileId, uid }] of profileByCustomer) {
            const authUser = authByUid.get(uid);
            if (authUser) {
                subscribers.set(customerId, {
                    profileId,
                    displayName: authUser.displayName ?? null,
                    email: authUser.email ?? null,
                });
            }
        }

        return subscribers;
    }

    /**
     * A profile whose Firebase Auth account was deleted outside the app would otherwise
     * reject the whole listing, so it is dropped from the result instead.
     *
     * Only that specific case is swallowed: a transient Admin SDK failure must surface,
     * because silently hiding records from a management screen is worse than failing.
     */
    private async mergeWithAuthUser(user: UserDTO): Promise<UserDTO | null> {
        const profile = serializeFirestoreData(user);
        try {
            const authUser = await getAuthInstance().getUser(user.reference_id);
            return mergeAuthAndFirestore(authUser, profile) as UserDTO;
        } catch (error) {
            if ((error as { code?: string }).code === "auth/user-not-found") {
                return null;
            }
            throw error;
        }
    }
}

export const userRepository = new UserRepository();
