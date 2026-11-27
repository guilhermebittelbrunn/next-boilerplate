import { cert, initializeApp } from "firebase-admin/app";
import { FieldPath, getFirestore } from "firebase-admin/firestore";
import { buildAuditLevelPatch } from "./auditLevelPatch.mjs";
import { isRealProjectTarget, readEmulatorTarget } from "./emulatorTarget.mjs";

const COLLECTION = "auditEvent";
const BATCH_SIZE = 400;

const USAGE = `Usage: pnpm --filter api backfill-audit-levels [--apply]

Writes level "sensitive" on every audit event that has no level, so the level filter of the
audit trail finds the events recorded before levels existed. Leaves updatedAt and expiresAt
untouched.

Against the emulators (FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST filled in) no
credentials are needed. Against a real Firebase project it needs the service account —
FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY
(apps/api/.env).

Runs as a dry run unless --apply is given. Safe to run more than once: an event that
already has a level is left untouched.`;

function parseArgs(argv) {
    let apply = false;

    for (const arg of argv) {
        if (arg === "--apply") {
            apply = true;
        } else {
            return { error: `Unknown argument: ${arg}` };
        }
    }

    return { apply };
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
        initializeApp({ projectId: target.projectId });
        return { projectId: target.projectId, real: false };
    }

    const serviceAccount = readServiceAccount();
    initializeApp({ credential: cert(serviceAccount) });
    return { projectId: serviceAccount.projectId, real: true };
}

/** Pages by document id so the trail never has to fit in memory at once. */
async function backfill(db, apply) {
    const ordered = db.collection(COLLECTION).orderBy(FieldPath.documentId());
    let cursor = null;
    let scanned = 0;
    let pending = 0;

    for (;;) {
        const page = await (cursor ? ordered.startAfter(cursor) : ordered)
            .limit(BATCH_SIZE)
            .get();

        if (page.empty) {
            return { scanned, pending };
        }

        const batch = db.batch();
        let queued = 0;

        for (const doc of page.docs) {
            const patch = buildAuditLevelPatch(doc.data());
            if (patch) {
                batch.update(doc.ref, patch);
                queued++;
            }
        }

        if (apply && queued > 0) {
            await batch.commit();
        }

        scanned += page.size;
        pending += queued;

        if (page.size < BATCH_SIZE) {
            return { scanned, pending };
        }
        cursor = page.docs.at(-1);
    }
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

    const { scanned, pending } = await backfill(getFirestore(), parsed.apply);

    process.stdout.write(
        `${COLLECTION}: ${scanned} scanned, ${pending} ${parsed.apply ? "updated" : "would be updated"}\n`
    );

    if (!parsed.apply) {
        process.stdout.write("\nRe-run with --apply to write these changes.\n");
    }
}

main().catch((error) => {
    process.stderr.write(`Backfill failed: ${error?.message ?? error}\n`);
    process.exit(1);
});
