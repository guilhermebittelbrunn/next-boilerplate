import {
    NOTIFICATION_UNREAD_COUNT_CAP,
    type NotificationDTO,
    type NotificationParamValue,
} from "@repo/sdk/src/types";
import type { Query } from "firebase-admin/firestore";
import db from "../infra/database";
import { isAlreadyExistsError } from "../infra/firestore-errors";
import { notificationMapper } from "../mappers/notification.mapper";
import {
    BaseRepository,
    type PageRequest,
    type RepositoryPage,
} from "./base.repository";

/** Firestore refuses a batch with more than 500 writes. */
const UNREAD_BATCH_SIZE = 500;
/**
 * Bounds one "mark all" call at 10k notifications. What is left over stays unread and the
 * next call picks it up, which beats a request that never returns.
 */
const MARK_ALL_MAX_PASSES = 20;

export type NotificationRecordInput = {
    userId: string;
    type: string;
    params: Record<string, NotificationParamValue>;
    createdAt: Date;
    expiresAt: Date;
};

class NotificationRepository extends BaseRepository<NotificationDTO> {
    constructor() {
        super(db, "notification", notificationMapper);
    }

    private byOwner(userId: string): Query {
        return this.db.collection(this.table).where("userId", "==", userId);
    }

    /**
     * `readAt` is always written as `null` on creation: a document without the field does
     * not match an equality filter on `null`, so it would never count as unread.
     */
    private unreadQuery(userId: string): Query {
        return this.byOwner(userId).where("readAt", "==", null);
    }

    listByUserId(
        userId: string,
        page: PageRequest
    ): Promise<RepositoryPage<NotificationDTO>> {
        return this.paginate(this.byOwner(userId), page);
    }

    countUnreadByUserId(userId: string): Promise<number> {
        return this.countQuery(
            this.unreadQuery(userId).limit(NOTIFICATION_UNREAD_COUNT_CAP)
        );
    }

    /** Both fields get the same instant, which is also what the caller hands back. */
    async markRead(id: string, at: Date = new Date()): Promise<string> {
        await this.db
            .collection(this.table)
            .doc(id)
            .update({ readAt: at, updatedAt: at });
        return at.toISOString();
    }

    /** Re-runs the query after each batch, so no `orderBy` (and no extra index) is needed. */
    async markAllReadByUserId(
        userId: string,
        at: Date = new Date()
    ): Promise<number> {
        let updated = 0;

        for (let pass = 0; pass < MARK_ALL_MAX_PASSES; pass++) {
            const snapshot = await this.unreadQuery(userId)
                .limit(UNREAD_BATCH_SIZE)
                .get();
            if (snapshot.empty) {
                return updated;
            }

            const batch = this.db.batch();
            for (const docSnap of snapshot.docs) {
                batch.update(docSnap.ref, { readAt: at, updatedAt: at });
            }
            await batch.commit();
            updated += snapshot.docs.length;
        }

        return updated;
    }

    /**
     * With an id, a second write for the same notification hits ALREADY_EXISTS and is
     * reported as a duplicate instead of a failure. Without one, Firestore picks the id.
     */
    async emitOnce(
        record: NotificationRecordInput,
        id: string | null
    ): Promise<"created" | "duplicate"> {
        const document = {
            userId: record.userId,
            type: record.type,
            params: record.params,
            readAt: null,
            expiresAt: record.expiresAt,
            createdAt: record.createdAt,
            updatedAt: record.createdAt,
            deletedAt: null,
        };

        if (!id) {
            await this.db.collection(this.table).add(document);
            return "created";
        }

        try {
            await this.db.collection(this.table).doc(id).create(document);
            return "created";
        } catch (error) {
            if (isAlreadyExistsError(error)) {
                return "duplicate";
            }
            throw error;
        }
    }

    /** Reads one over the cap to tell a full page apart from a truncated one. */
    async findAllByUserId(
        userId: string,
        limit: number
    ): Promise<{ items: NotificationDTO[]; truncated: boolean }> {
        const snapshot = await this.byOwner(userId)
            .limit(limit + 1)
            .get();

        const truncated = snapshot.docs.length > limit;
        const docs = truncated ? snapshot.docs.slice(0, limit) : snapshot.docs;

        return {
            items: docs.map((docSnap) =>
                this.toDTO(
                    docSnap.id,
                    docSnap.data() as Record<string, unknown>
                )
            ),
            truncated,
        };
    }

    purgeAllByUserId(userId: string): Promise<number> {
        return this.purgeAll(this.byOwner(userId));
    }
}

export const notificationRepository = new NotificationRepository();
