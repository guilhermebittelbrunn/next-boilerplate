import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { isRealProjectTarget, readEmulatorTarget } from "./emulatorTarget.mjs";

const INSTANT_FIELDS = ["createdAt", "updatedAt", "deletedAt"];
const BATCH_SIZE = 400;

const USAGE = `Usage: pnpm --filter api backfill-instants --collection=<name> [--collection=<name>] [--apply]

Rewrites ISO-string instants as Firestore Timestamps and stamps a null deletedAt where the
field is missing, so ordered and filtered queries see every document.

Against the emulators (FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST filled in) no
credentials are needed. Against a real Firebase project it needs the service account —
FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY
(apps/api/.env).

Runs as a dry run unless --apply is given. Safe to run more than once: a document that is
already correct is left untouched.`;

function parseArgs(argv) {
    const collections = [];
    let apply = false;

    for (const arg of argv) {
        if (arg === "--apply") {
            apply = true;
        } else if (arg.startsWith("--collection=")) {
            const name = arg.slice("--collection=".length).trim();
            if (name) {
                collections.push(name);
            }
        } else {
            return { error: `Unknown argument: ${arg}` };
        }
    }

    if (collections.length === 0) {
        return { error: "At least one --collection=<name> is required." };
    }

    return { collections, apply };
}

function readServiceAccount() {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

    if (!(projectId && clientEmail && privateKey)) {
        process.stderr.write(
            `Missing Firebase Admin credentials.\n\n${USAGE}\n`
        );
        process.exit(1);
    }

    return {
        projectId,
        clientEmail,
        // Env files carry the key with escaped newlines; the Admin SDK needs the real ones.
        privateKey: privateKey.replace(/\\n/g, "\n"),
    };
}

function initializeTarget() {
    const target = readEmulatorTarget();

    if (!isRealProjectTarget(target)) {
        // There is nobody to authenticate to on an emulator; the project id is enough.
        initializeApp({ projectId: target.projectId });
        return { projectId: target.projectId, real: false };
    }

    const serviceAccount = readServiceAccount();
    initializeApp({ credential: cert(serviceAccount) });
    return { projectId: serviceAccount.projectId, real: true };
}

/** Returns the patch a document needs, or null when it is already well formed. */
function buildPatch(data) {
    const patch = {};

    for (const field of INSTANT_FIELDS) {
        const value = data[field];

        if (!(field in data)) {
            if (field === "deletedAt") {
                patch[field] = null;
            }
            continue;
        }

        if (typeof value !== "string") {
            continue;
        }

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            continue;
        }

        patch[field] = Timestamp.fromDate(parsed);
    }

    return Object.keys(patch).length > 0 ? patch : null;
}

async function backfillCollection(db, collection, apply) {
    const snapshot = await db.collection(collection).get();
    const pending = [];

    for (const doc of snapshot.docs) {
        const patch = buildPatch(doc.data());
        if (patch) {
            pending.push({ ref: doc.ref, id: doc.id, patch });
        }
    }

    if (apply) {
        for (let start = 0; start < pending.length; start += BATCH_SIZE) {
            const batch = db.batch();
            for (const item of pending.slice(start, start + BATCH_SIZE)) {
                batch.update(item.ref, item.patch);
            }
            await batch.commit();
        }
    }

    return { scanned: snapshot.size, pending };
}

async function main() {
    const parsed = parseArgs(process.argv.slice(2));
    if (parsed.error) {
        process.stderr.write(`${parsed.error}\n\n${USAGE}\n`);
        process.exit(1);
    }

    const { projectId, real } = initializeTarget();
    const where = real ? "REAL project" : "emulated project";

    process.stdout.write(
        [
            parsed.apply
                ? `Writing to ${where} "${projectId}".`
                : `Dry run against ${where} "${projectId}". Nothing will be written.`,
            "",
        ].join("\n")
    );

    const db = getFirestore();

    for (const collection of parsed.collections) {
        const { scanned, pending } = await backfillCollection(
            db,
            collection,
            parsed.apply
        );

        process.stdout.write(
            `${collection}: ${scanned} scanned, ${pending.length} ${parsed.apply ? "updated" : "would be updated"}\n`
        );

        for (const item of pending) {
            process.stdout.write(
                `  ${item.id}: ${Object.keys(item.patch).join(", ")}\n`
            );
        }
    }

    if (!parsed.apply) {
        process.stdout.write("\nRe-run with --apply to write these changes.\n");
    }
}

main().catch((error) => {
    process.stderr.write(`Backfill failed: ${error?.message ?? error}\n`);
    process.exit(1);
});
