import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { DEMO_PROJECT_ID, DEMO_WEB_API_KEY } from "@repo/auth/emulator";
import { deleteApp, type FirebaseApp, initializeApp } from "firebase/app";
import {
    collection,
    connectFirestoreEmulator,
    deleteDoc,
    doc,
    type Firestore,
    getDoc,
    getDocs,
    getFirestore,
    setDoc,
    setLogLevel,
    terminate,
    updateDoc,
} from "firebase/firestore";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getFirestoreAdmin } = await import("@repo/auth/server");

// Every refusal below is expected, and the client logs each one as an error.
setLogLevel("silent");

const REPOSITORIES_DIR = path.resolve(__dirname, "../(shared)/repositories");
const COLLECTION_NAME_RE = /super\(\s*db,\s*"([^"]+)"/g;

/** Every collection a repository names, so a collection a fork adds is covered unasked. */
const discoverRepositoryCollections = (): string[] =>
    readdirSync(REPOSITORIES_DIR)
        .filter((file) => file.endsWith(".repository.ts"))
        .flatMap((file) =>
            [
                ...readFileSync(
                    path.join(REPOSITORIES_DIR, file),
                    "utf8"
                ).matchAll(COLLECTION_NAME_RE),
            ].map((match) => match[1] as string)
        );

const REPOSITORY_COLLECTIONS = discoverRepositoryCollections();
const RUN_ID = randomUUID();
const PROBE_ID = `__rules_probe__${RUN_ID}`;

/** Collection paths, each holding a probe document written through the Admin SDK. */
const PROBED_COLLECTIONS = [
    ...REPOSITORY_COLLECTIONS,
    `rules-probe-${RUN_ID}`,
    `user/${PROBE_ID}/nested`,
];

const [emulatorHost, emulatorPort] = (
    process.env.FIRESTORE_EMULATOR_HOST as string
).split(":") as [string, string];

type Identity = { label: string; db: Firestore; app: FirebaseApp };

const identities: Identity[] = [];

/** Only lands if a rule was opened up, and must not outlive the run even then. */
const attemptedCreations: string[] = [];

function clientFor(label: string, uid: string | null): Identity {
    const app = initializeApp(
        { projectId: DEMO_PROJECT_ID, apiKey: DEMO_WEB_API_KEY },
        `firestore-rules-${label}-${RUN_ID}`
    );
    const db = getFirestore(app);
    connectFirestoreEmulator(
        db,
        emulatorHost,
        Number(emulatorPort),
        uid ? { mockUserToken: { user_id: uid } } : {}
    );
    const identity = { label, db, app };
    identities.push(identity);
    return identity;
}

const anonymous = clientFor("anonymous", null);
const signedIn = clientFor("signed-in", `rules-user-${RUN_ID}`);
// Signed in as the probe's owner, by document id and by the owner fields the repositories
// use: a per-owner rule is the likeliest way to open a collection to clients.
const owner = clientFor("owner", PROBE_ID);
const PROBE_DATA = { probe: true, reference_id: PROBE_ID, userId: PROBE_ID };

/** What a refused call rejects with, or a marker when the call went through. */
const OPERATION_SUCCEEDED = "operation-succeeded";

const rejectionCode = (operation: Promise<unknown>): Promise<unknown> =>
    operation.then(
        () => OPERATION_SUCCEEDED,
        (error: { code?: unknown }) => error?.code
    );

const DENIED = "permission-denied";

beforeAll(async () => {
    const admin = getFirestoreAdmin();
    await Promise.all(
        PROBED_COLLECTIONS.map((collectionPath) =>
            admin.collection(collectionPath).doc(PROBE_ID).set(PROBE_DATA)
        )
    );
});

afterAll(async () => {
    const admin = getFirestoreAdmin();
    await Promise.all([
        ...PROBED_COLLECTIONS.map((collectionPath) =>
            admin.collection(collectionPath).doc(PROBE_ID).delete()
        ),
        ...attemptedCreations.map((documentPath) =>
            admin.doc(documentPath).delete()
        ),
    ]);
    for (const identity of identities) {
        await terminate(identity.db);
        await deleteApp(identity.app);
    }
});

describe("collections discovered in the repositories", () => {
    it("include the user collection", () => {
        expect(REPOSITORY_COLLECTIONS).toContain("user");
    });
});

describe("probe documents", () => {
    it.each(PROBED_COLLECTIONS)(
        "exist in %s, so a refusal cannot come from a missing document",
        async (collectionPath) => {
            const snapshot = await getFirestoreAdmin()
                .collection(collectionPath)
                .doc(PROBE_ID)
                .get();

            expect(snapshot.exists).toBe(true);
        }
    );
});

describe.each([anonymous, signedIn, owner])(
    "firestore.rules for the $label client",
    ({ db }) => {
        it.each(PROBED_COLLECTIONS)(
            "refuses reading a document of %s",
            async (collectionPath) => {
                expect(
                    await rejectionCode(
                        getDoc(doc(db, collectionPath, PROBE_ID))
                    )
                ).toBe(DENIED);
            }
        );

        it.each(PROBED_COLLECTIONS)(
            "refuses listing %s",
            async (collectionPath) => {
                expect(
                    await rejectionCode(getDocs(collection(db, collectionPath)))
                ).toBe(DENIED);
            }
        );

        it.each(PROBED_COLLECTIONS)(
            "refuses creating a document in %s",
            async (collectionPath) => {
                const documentPath = `${collectionPath}/created-${randomUUID()}`;
                attemptedCreations.push(documentPath);

                expect(
                    await rejectionCode(
                        setDoc(doc(db, documentPath), { probe: true })
                    )
                ).toBe(DENIED);
            }
        );

        it.each(PROBED_COLLECTIONS)(
            "refuses updating the probe of %s",
            async (collectionPath) => {
                expect(
                    await rejectionCode(
                        updateDoc(doc(db, collectionPath, PROBE_ID), {
                            probe: false,
                        })
                    )
                ).toBe(DENIED);
            }
        );

        it.each(PROBED_COLLECTIONS)(
            "refuses deleting the probe of %s",
            async (collectionPath) => {
                expect(
                    await rejectionCode(
                        deleteDoc(doc(db, collectionPath, PROBE_ID))
                    )
                ).toBe(DENIED);
            }
        );
    }
);
