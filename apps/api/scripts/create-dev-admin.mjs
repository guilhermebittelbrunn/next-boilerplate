import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { isRealProjectTarget, readEmulatorTarget } from "./emulatorTarget.mjs";

const ALLOW_REAL_PROJECT_FLAG = "--allow-real-project";

const USAGE = `Usage: pnpm --filter api create-dev-admin <email> <password>
   or: DEV_ADMIN_EMAIL=... DEV_ADMIN_PASSWORD=... pnpm --filter api create-dev-admin

Against the emulators (FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST filled in)
no credentials are needed. Against a real Firebase project it needs the service account
— FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY
(apps/api/.env) — and ${ALLOW_REAL_PROJECT_FLAG}.`;

const USERS_COLLECTION = "user";
const ADMIN_TYPE = "admin";

function fail(message) {
    process.stderr.write(`${message}\n`);
    process.exit(1);
}

/**
 * Creating an administrator with a password someone just typed on the command line is
 * harmless against an emulator and irreversible against a live project, so the real one
 * takes written consent rather than the printed warning it used to get afterwards.
 */
const allowRealProject = () =>
    process.argv.includes(ALLOW_REAL_PROJECT_FLAG) ||
    process.env.DEV_ADMIN_ALLOW_REAL_PROJECT === "1";

function readCredentials() {
    // The flag has to come out before the positionals are read, or passing it first
    // makes it the email.
    const [emailArg, passwordArg] = process.argv
        .slice(2)
        .filter((arg) => arg !== ALLOW_REAL_PROJECT_FLAG);
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

function initializeTarget() {
    const target = readEmulatorTarget();

    if (!isRealProjectTarget(target)) {
        // There is nobody to authenticate to on an emulator; the project id is enough.
        initializeApp({ projectId: target.projectId });
        return { projectId: target.projectId, real: false };
    }

    if (!allowRealProject()) {
        fail(
            [
                "Refusing to run: no emulator host is set, so this would create an administrator",
                "with a password you just typed in a REAL Firebase project",
                `("${target.projectId ?? "unknown project"}").`,
                "",
                "Start the emulators with `pnpm emulators` to bootstrap locally, or repeat the",
                `command with ${ALLOW_REAL_PROJECT_FLAG} if a real project is genuinely what you want.`,
            ].join("\n")
        );
    }

    const serviceAccount = readServiceAccount();
    initializeApp({ credential: cert(serviceAccount) });
    return { projectId: serviceAccount.projectId, real: true };
}

async function main() {
    const { email, password } = readCredentials();
    const { projectId, real } = initializeTarget();

    const { uid, created } = await ensureAuthUser(getAuth(), email, password);
    const { id, promoted } = await ensureAdminProfile(getFirestore(), uid);

    process.stdout.write(
        [
            real
                ? `Created a REAL administrator in the Firebase project "${projectId}".`
                : `Created an administrator in the emulated project "${projectId}".`,
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
