import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const USAGE = `Usage: pnpm --filter api create-dev-admin <email> <password>
   or: DEV_ADMIN_EMAIL=... DEV_ADMIN_PASSWORD=... pnpm --filter api create-dev-admin

Requires FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL and
FIREBASE_ADMIN_PRIVATE_KEY (apps/api/.env).`;

const USERS_COLLECTION = "user";
const ADMIN_TYPE = "admin";

function fail(message) {
    process.stderr.write(`${message}\n`);
    process.exit(1);
}

function readCredentials() {
    const [emailArg, passwordArg] = process.argv.slice(2);
    const email = emailArg ?? process.env.DEV_ADMIN_EMAIL;
    const password = passwordArg ?? process.env.DEV_ADMIN_PASSWORD;

    if (!(email && password)) {
        fail(`Missing email or password.\n\n${USAGE}`);
    }

    return { email, password };
}

function readServiceAccount() {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

    if (!(projectId && clientEmail && privateKey)) {
        fail(`Missing Firebase Admin credentials.\n\n${USAGE}`);
    }

    return {
        projectId,
        clientEmail,
        // Env files carry the key with escaped newlines; the Admin SDK needs the real ones.
        privateKey: privateKey.replace(/\\n/g, "\n"),
    };
}

async function ensureAuthUser(auth, email, password) {
    try {
        const existing = await auth.getUserByEmail(email);
        // Re-running is how an operator recovers a password they no longer have, so the
        // one they just typed has to become the account's password.
        await auth.updateUser(existing.uid, { password });
        return { uid: existing.uid, created: false };
    } catch (error) {
        if (error?.code !== "auth/user-not-found") {
            throw error;
        }
    }

    const created = await auth.createUser({
        email,
        password,
        emailVerified: true,
    });
    return { uid: created.uid, created: true };
}

async function ensureAdminProfile(db, uid) {
    const now = new Date();
    const collection = db.collection(USERS_COLLECTION);
    const existing = await collection
        .where("reference_id", "==", uid)
        .limit(1)
        .get();

    if (existing.empty) {
        // `deletedAt: null` is not decorative: the profile lookup filters on it, so a
        // profile without the field is invisible to the API.
        const created = await collection.add({
            reference_id: uid,
            type: ADMIN_TYPE,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
        });
        return { id: created.id, promoted: false };
    }

    const [profile] = existing.docs;
    await profile.ref.update({
        type: ADMIN_TYPE,
        updatedAt: now,
        deletedAt: null,
    });
    return { id: profile.id, promoted: true };
}

async function main() {
    const { email, password } = readCredentials();
    const serviceAccount = readServiceAccount();

    initializeApp({ credential: cert(serviceAccount) });

    const { uid, created } = await ensureAuthUser(getAuth(), email, password);
    const { id, promoted } = await ensureAdminProfile(getFirestore(), uid);

    process.stdout.write(
        [
            "Development bootstrap — this creates a real administrator in the",
            `Firebase project "${serviceAccount.projectId}". Never run it against production.`,
            "",
            `auth user : ${uid} (${created ? "created" : "already existed, password reset"})`,
            `profile   : ${id} (${promoted ? "promoted to admin" : "created as admin"})`,
            `email     : ${email}`,
            "",
        ].join("\n")
    );
}

main().catch((error) => {
    fail(
        `Failed to bootstrap the development admin: ${error?.message ?? error}`
    );
});
