import type { DocumentData } from "firebase-admin/firestore";
import db from "../infra/database";
import { sessionDocId } from "../lib/session-key";
import type { DeviceDescription } from "../lib/user-agent";
import {
    type SessionRecord,
    type SessionRevokedReason,
    sessionMapper,
} from "../mappers/session.mapper";
import { BaseRepository } from "./base.repository";

/** Firestore refuses a batch with more than 500 writes. */
const WRITE_BATCH_SIZE = 500;
const MS_PER_SECOND = 1000;

export type SessionSeenInput = {
    uid: string;
    sessionKey: string;
    at: Date;
    device: DeviceDescription | null;
    /** Set when an earlier "end the other sessions" already covers this one. */
    revokedAt: Date | null;
};

function signedInAtOf(sessionKey: string): Date {
    return new Date(Number(sessionKey) * MS_PER_SECOND);
}

function deviceFields(device: DeviceDescription | null): DocumentData {
    return {
        browser: device?.browser ?? null,
        os: device?.os ?? null,
        deviceType: device?.deviceType ?? null,
    };
}

/** Identity fields, written with every merge so a partial document still lists by owner. */
function identityFields(uid: string, sessionKey: string): DocumentData {
    return { uid, sessionKey, signedInAt: signedInAtOf(sessionKey) };
}

/**
 * One document per browser sign-in, under a deterministic id, so the per-request check is
 * a read by id. Nothing here soft-deletes: an ended session is kept with `revokedAt`, since
 * deleting it would let a Firebase client that still holds the refresh token back in.
 */
class SessionRepository extends BaseRepository<SessionRecord> {
    constructor() {
        super(db, "session", sessionMapper);
    }

    private ref(uid: string, sessionKey: string) {
        return this.db
            .collection(this.table)
            .doc(sessionDocId(uid, sessionKey));
    }

    findByUidAndKey(
        uid: string,
        sessionKey: string
    ): Promise<SessionRecord | null> {
        return this.findById(sessionDocId(uid, sessionKey));
    }

    /** Single-field query on the automatic index; the soft-delete filter runs in memory. */
    async listByUid(uid: string): Promise<SessionRecord[]> {
        const snapshot = await this.db
            .collection(this.table)
            .where("uid", "==", uid)
            .get();

        return snapshot.docs
            .filter((docSnap) => docSnap.data().deletedAt == null)
            .map((docSnap) =>
                this.toDTO(
                    docSnap.id,
                    docSnap.data() as Record<string, unknown>
                )
            );
    }

    /** Every session, ended ones included. Reads one over the cap to tell a truncated list. */
    async findAllByUid(
        uid: string,
        limit: number
    ): Promise<{ items: SessionRecord[]; truncated: boolean }> {
        const snapshot = await this.db
            .collection(this.table)
            .where("uid", "==", uid)
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

    /**
     * Merged, and without `revokedAt` for an active session: a revocation written by a
     * request running in parallel must not be wiped by the one that saw the session first.
     */
    async createSeen(input: SessionSeenInput): Promise<void> {
        await this.ref(input.uid, input.sessionKey).set(
            {
                ...identityFields(input.uid, input.sessionKey),
                ...deviceFields(input.device),
                lastSeenAt: input.at,
                createdAt: input.at,
                updatedAt: input.at,
                deletedAt: null,
                ...(input.revokedAt
                    ? { revokedAt: input.revokedAt, revokedReason: "others" }
                    : {}),
            },
            { merge: true }
        );
    }

    /** A use is not an edit, so `updatedAt` stays put. */
    async touchSeen(
        id: string,
        at: Date,
        device: DeviceDescription | null
    ): Promise<void> {
        await this.db
            .collection(this.table)
            .doc(id)
            .update({
                lastSeenAt: at,
                ...(device ? deviceFields(device) : {}),
            });
    }

    /**
     * Merged so that it also lands on a session the API never saw in use: signing out of
     * one of those still has to stop the other front-end from writing the cookie back.
     */
    async revoke(
        uid: string,
        sessionKey: string,
        reason: SessionRevokedReason,
        at: Date
    ): Promise<void> {
        await this.ref(uid, sessionKey).set(
            {
                ...identityFields(uid, sessionKey),
                revokedAt: at,
                revokedReason: reason,
                updatedAt: at,
            },
            { merge: true }
        );
    }

    /**
     * Ends every other open session and leaves a watermark on the one kept: a session that
     * started before it and that the API has not seen yet is refused on first contact.
     * Answers how many sessions were ended.
     */
    async revokeOthers(
        uid: string,
        keepKey: string,
        at: Date
    ): Promise<number> {
        const others = (await this.listByUid(uid)).filter(
            (session) => session.sessionKey !== keepKey && !session.revokedAt
        );

        const writes: { id: string; data: DocumentData }[] = [
            ...others.map((session) => ({
                id: session.id,
                data: { revokedAt: at, revokedReason: "others", updatedAt: at },
            })),
            {
                id: sessionDocId(uid, keepKey),
                data: {
                    ...identityFields(uid, keepKey),
                    othersRevokedBefore: at,
                    updatedAt: at,
                },
            },
        ];

        for (let start = 0; start < writes.length; start += WRITE_BATCH_SIZE) {
            const batch = this.db.batch();
            for (const write of writes.slice(start, start + WRITE_BATCH_SIZE)) {
                batch.set(
                    this.db.collection(this.table).doc(write.id),
                    write.data,
                    { merge: true }
                );
            }
            await batch.commit();
        }

        return others.length;
    }

    /** Ended sessions included: they still say where the account was used. */
    purgeAllByUid(uid: string): Promise<number> {
        return this.purgeAll(
            this.db.collection(this.table).where("uid", "==", uid)
        );
    }
}

export const sessionRepository = new SessionRepository();
