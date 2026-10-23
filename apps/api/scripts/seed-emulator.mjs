import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { readEmulatorTarget, refuseSeedReason } from "./emulatorTarget.mjs";

const target = readEmulatorTarget();
const refusal = refuseSeedReason(target);

// Checked before initializeApp so a misconfigured run cannot reach a database at all.
if (refusal) {
    process.stderr.write(`${refusal}\n`);
    process.exit(1);
}

const USERS_COLLECTION = "user";
const ENTITIES_COLLECTION = "entity";
const NOTIFICATIONS_COLLECTION = "notification";
const NOTIFICATION_RETENTION_DAYS = 90;
const MS_PER_DAY = 86_400_000;
const MS_PER_MINUTE = 60_000;
const SEED_PASSWORD = "demo1234";
const EMAIL_COLUMN_WIDTH = 20;
const TYPE_COLUMN_WIDTH = 7;

const ACCOUNTS = [
    { email: "admin@example.com", type: "admin" },
    { email: "user@example.com", type: "common" },
    { email: "user2@example.com", type: "common" },
];

/**
 * Deliberately covers the edges the panel has to render: every EntityType, a disabled
 * record, an empty description, and null genre/birthdate. `photo` stays null because
 * the seed uploads no object, and a path to a missing one would render a broken image.
 */
const ENTITIES_BY_OWNER = {
    "user@example.com": [
        {
            name: "Acme Franchise",
            description: "Flagship unit downtown",
            type: "franchise",
            genre: null,
            birthdate: null,
            enabled: true,
        },
        {
            name: "Joana Ribeiro",
            description: "Recurring customer",
            type: "customer",
            genre: "female",
            birthdate: "1990-04-17",
            enabled: true,
        },
        {
            name: "Marcos Pereira",
            description: "",
            type: "collaborator",
            genre: "male",
            birthdate: "1985-11-02",
            enabled: true,
        },
        {
            name: "Retired Unit",
            description: "Kept for history, switched off",
            type: "franchise",
            genre: null,
            birthdate: null,
            enabled: false,
        },
    ],
    // A second owner exists so that the organization scope (a 404 on another
    // organization's record) can be exercised without creating an account by hand.
    "user2@example.com": [
        {
            name: "Other Owner Shop",
            description: "Belongs to the second common user",
            type: "franchise",
            genre: null,
            birthdate: null,
            enabled: true,
        },
        {
            name: "Alex Moreira",
            description: "Belongs to the second common user",
            type: "customer",
            genre: "other",
            birthdate: "2000-01-30",
            enabled: true,
        },
    ],
};

const SEEDED_WELCOME_NOTIFICATIONS = 21;

/**
 * Newest first. 25 for one owner so the bell pages through three loads of 10; one of
 * each core type plus a type no build knows, which must render the generic copy. The
 * second common account gets none, for the empty state.
 */
const NOTIFICATIONS_BY_OWNER = {
    "user@example.com": [
        { type: "subscriptionPaymentPending", read: false },
        { type: "subscriptionCanceled", read: false },
        { type: "subscriptionReactivated", read: true },
        { type: "legacyTypeRemoved", read: false },
        ...Array.from({ length: SEEDED_WELCOME_NOTIFICATIONS }, (_, index) => ({
            type: "welcome",
            read: index % 2 === 0,
        })),
    ],
};

async function wipe() {
    const auth = await fetch(
        `http://${target.authHost}/emulator/v1/projects/${target.projectId}/accounts`,
        { method: "DELETE" }
    );
    const firestore = await fetch(
        `http://${target.firestoreHost}/emulator/v1/projects/${target.projectId}/databases/(default)/documents`,
        { method: "DELETE" }
    );

    if (!(auth.ok && firestore.ok)) {
        throw new Error(
            `Could not clear the emulators (auth ${auth.status}, firestore ${firestore.status}). Are they running? Start them with \`pnpm emulators\`.`
        );
    }
}

/**
 * The account has to exist in Auth before the profile is written: the admin listing
 * joins the two by `reference_id` and drops any profile whose uid it cannot find.
 */
async function createAccount(auth, db, { email, type }) {
    const user = await auth.createUser({
        email,
        password: SEED_PASSWORD,
        // Otherwise every seeded login lands on the "verify your email" screen.
        emailVerified: true,
    });

    const now = new Date();
    const profile = await db.collection(USERS_COLLECTION).add({
        reference_id: user.uid,
        type,
        createdAt: now,
        updatedAt: now,
        // Not decorative: every lookup filters on `deletedAt == null`, and Firestore
        // does not match a missing field against null, so the profile would be invisible.
        deletedAt: null,
    });

    return { uid: user.uid, profileId: profile.id };
}

async function createEntities(db, profileId, entities) {
    const now = new Date();
    for (const entity of entities) {
        await db.collection(ENTITIES_COLLECTION).add({
            ...entity,
            // The author is the profile document id, not the Auth uid. There is no
            // `organizationId` on purpose: the first request of the owner stamps it with
            // their organization, the same path a fork in production takes for records
            // that predate organizations.
            userId: profileId,
            photo: null,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
        });
    }
}

async function createNotifications(db, profileId, notifications) {
    const newest = Date.now();
    for (const [index, notification] of notifications.entries()) {
        const createdAt = new Date(newest - index * MS_PER_MINUTE);
        await db
            .collection(NOTIFICATIONS_COLLECTION)
            .doc(`seed_${profileId}_${String(index).padStart(2, "0")}`)
            .set({
                userId: profileId,
                type: notification.type,
                params: {},
                // `null`, never absent: the unread count filters on `readAt == null`.
                readAt: notification.read ? createdAt : null,
                expiresAt: new Date(
                    createdAt.getTime() +
                        NOTIFICATION_RETENTION_DAYS * MS_PER_DAY
                ),
                createdAt,
                updatedAt: createdAt,
                deletedAt: null,
            });
    }
}

async function main() {
    initializeApp({ projectId: target.projectId });
    const auth = getAuth();
    const db = getFirestore();

    await wipe();

    const rows = [];
    for (const account of ACCOUNTS) {
        const { profileId } = await createAccount(auth, db, account);
        const entities = ENTITIES_BY_OWNER[account.email] ?? [];
        await createEntities(db, profileId, entities);
        const notifications = NOTIFICATIONS_BY_OWNER[account.email] ?? [];
        await createNotifications(db, profileId, notifications);
        rows.push({
            ...account,
            entities: entities.length,
            notifications: notifications.length,
        });
    }

    process.stdout.write(
        [
            `Seeded the emulated project "${target.projectId}". Every account uses the password ${SEED_PASSWORD}.`,
            "",
            ...rows.map(
                (row) =>
                    `  ${row.email.padEnd(EMAIL_COLUMN_WIDTH)} ${row.type.padEnd(TYPE_COLUMN_WIDTH)} ${row.entities} entities, ${row.notifications} notifications`
            ),
            "",
            "This state lives only in the emulators and is rebuilt from scratch every run.",
            "",
        ].join("\n")
    );
}

main().catch((error) => {
    process.stderr.write(`Failed to seed: ${error?.message ?? error}\n`);
    process.exit(1);
});
