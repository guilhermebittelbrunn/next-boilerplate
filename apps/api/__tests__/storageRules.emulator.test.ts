import { randomUUID } from "node:crypto";
import {
    DEMO_PROJECT_ID,
    DEMO_STORAGE_BUCKET,
    DEMO_WEB_API_KEY,
} from "@repo/auth/emulator";
import { deleteApp, type FirebaseApp, initializeApp } from "firebase/app";
import {
    connectStorageEmulator,
    deleteObject,
    type FirebaseStorage,
    getBytes,
    getMetadata,
    getStorage,
    listAll,
    ref,
    uploadBytes,
} from "firebase/storage";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/env", () => ({ env: { FIREBASE_STORAGE_BUCKET: "" } }));

const { deleteObjectsByPrefix, listObjectPaths, ownerPrefix, putObject } =
    await import("@/(shared)/lib/storage");

const RUN_ID = randomUUID();
const OWNER_ID = `emu-rules-${RUN_ID}`;
const OBJECT_PATH = `${ownerPrefix(OWNER_ID)}${randomUUID()}.png`;
const PUBLIC_PATH = `public/rules-probe-${RUN_ID}.png`;
const PNG_MAGIC = Uint8Array.from(Buffer.from("89504e470d0a1a0a", "hex"));

const [emulatorHost, emulatorPort] = (
    process.env.FIREBASE_STORAGE_EMULATOR_HOST as string
).split(":") as [string, string];

type Identity = { label: string; storage: FirebaseStorage; app: FirebaseApp };

const identities: Identity[] = [];

function clientFor(label: string, uid: string | null): Identity {
    const app = initializeApp(
        {
            projectId: DEMO_PROJECT_ID,
            apiKey: DEMO_WEB_API_KEY,
            storageBucket: DEMO_STORAGE_BUCKET,
        },
        `storage-rules-${label}-${RUN_ID}`
    );
    const storage = getStorage(app);
    connectStorageEmulator(
        storage,
        emulatorHost,
        Number(emulatorPort),
        uid ? { mockUserToken: { user_id: uid } } : {}
    );
    const identity = { label, storage, app };
    identities.push(identity);
    return identity;
}

const anonymous = clientFor("anonymous", null);
const signedIn = clientFor("signed-in", `rules-user-${RUN_ID}`);
// Signed in as the uid in the object path: a per-owner rule is the likeliest way to open
// the bucket, and it would let this client through while refusing every other one.
const owner = clientFor("owner", OWNER_ID);

/** What a refused call rejects with, or a marker when the call went through. */
const OPERATION_SUCCEEDED = "operation-succeeded";

const rejectionCode = (operation: Promise<unknown>): Promise<unknown> =>
    operation.then(
        () => OPERATION_SUCCEEDED,
        (error: { code?: unknown }) => error?.code
    );

/**
 * The code is checked, not just the rejection: with the rule opened up, reading a
 * missing object still rejects, as `storage/object-not-found`, and would pass unnoticed.
 */
const UNAUTHORIZED = "storage/unauthorized";

beforeAll(async () => {
    await putObject(OBJECT_PATH, Buffer.from(PNG_MAGIC), "image/png");
});

afterAll(async () => {
    await deleteObjectsByPrefix(ownerPrefix(OWNER_ID));
    await deleteObjectsByPrefix(PUBLIC_PATH);
    for (const identity of identities) {
        await deleteApp(identity.app);
    }
});

describe("probe object", () => {
    it("exists, so a refusal cannot come from a missing object", async () => {
        expect(await listObjectPaths(ownerPrefix(OWNER_ID))).toEqual([
            OBJECT_PATH,
        ]);
    });
});

describe.each([anonymous, signedIn, owner])(
    "storage.rules for the $label client",
    ({ storage }) => {
        it("refuses downloading the object", async () => {
            expect(
                await rejectionCode(getBytes(ref(storage, OBJECT_PATH)))
            ).toBe(UNAUTHORIZED);
        });

        it("refuses reading its metadata", async () => {
            expect(
                await rejectionCode(getMetadata(ref(storage, OBJECT_PATH)))
            ).toBe(UNAUTHORIZED);
        });

        it.each([OBJECT_PATH, PUBLIC_PATH])(
            "refuses uploading to %s",
            async (objectPath) => {
                expect(
                    await rejectionCode(
                        uploadBytes(ref(storage, objectPath), PNG_MAGIC, {
                            contentType: "image/png",
                        })
                    )
                ).toBe(UNAUTHORIZED);
            }
        );

        it("refuses deleting the object", async () => {
            expect(
                await rejectionCode(deleteObject(ref(storage, OBJECT_PATH)))
            ).toBe(UNAUTHORIZED);
        });

        it("refuses listing the uploads prefix", async () => {
            expect(await rejectionCode(listAll(ref(storage, "uploads")))).toBe(
                UNAUTHORIZED
            );
        });
    }
);

describe("after the refusals", () => {
    it("the object is still there", async () => {
        expect(await listObjectPaths(ownerPrefix(OWNER_ID))).toEqual([
            OBJECT_PATH,
        ]);
    });
});
