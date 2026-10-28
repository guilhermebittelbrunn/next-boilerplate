import { createHash, randomBytes } from "node:crypto";
import { DEMO_PROJECT_ID } from "./stackEnv";
import { AUTH_EMULATOR_HOST, FIRESTORE_EMULATOR_HOST } from "./urls";

const DOCUMENTS_URL = `http://${FIRESTORE_EMULATOR_HOST}/v1/projects/${DEMO_PROJECT_ID}/databases/(default)/documents`;
// The emulator treats this bearer as an admin and skips the security rules, the same
// access the API has through the Admin SDK.
const ADMIN_HEADERS = {
    Authorization: "Bearer owner",
    "Content-Type": "application/json",
};

const MS_PER_DAY = 86_400_000;
const INVITATION_TTL_DAYS = 7;
const INVITATION_TTL_MS = INVITATION_TTL_DAYS * MS_PER_DAY;
const INVITATION_TOKEN_BYTES = 32;

type FirestoreValue =
    | { stringValue: string }
    | { timestampValue: string }
    | { nullValue: null };

type FirestoreDocument = {
    name: string;
    fields?: Record<string, FirestoreValue>;
};

const sha256 = (value: string) =>
    createHash("sha256").update(value).digest("hex");

async function emulatorJson<T>(url: string, init: RequestInit): Promise<T> {
    const response = await fetch(url, { ...init, headers: ADMIN_HEADERS });
    if (!response.ok) {
        throw new Error(
            `Emulator answered ${response.status} for ${init.method ?? "GET"} ${url}`
        );
    }
    return (await response.json()) as T;
}

const stringField = (document: FirestoreDocument, field: string) => {
    const value = document.fields?.[field];
    return value && "stringValue" in value ? value.stringValue : null;
};

/** The uid of an emulated account, asked to the Auth emulator with its password. */
async function uidOf(email: string, password: string): Promise<string> {
    const { localId } = await emulatorJson<{ localId: string }>(
        `http://${AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator`,
        {
            method: "POST",
            body: JSON.stringify({ email, password, returnSecureToken: true }),
        }
    );
    return localId;
}

/** The Firestore profile id of an account: what memberships and invitations point at. */
export async function profileIdOf(
    email: string,
    password: string
): Promise<string> {
    const uid = await uidOf(email, password);
    const rows = await emulatorJson<{ document?: FirestoreDocument }[]>(
        `${DOCUMENTS_URL}:runQuery`,
        {
            method: "POST",
            body: JSON.stringify({
                structuredQuery: {
                    from: [{ collectionId: "user" }],
                    where: {
                        fieldFilter: {
                            field: { fieldPath: "reference_id" },
                            op: "EQUAL",
                            value: { stringValue: uid },
                        },
                    },
                },
            }),
        }
    );
    const document = rows.find((row) => row.document)?.document;
    if (!document) {
        throw new Error(`No profile for ${email} in the emulator`);
    }
    return document.name.split("/").at(-1) as string;
}

/** The organization the profile works in; its first request to a team route creates it. */
export async function organizationIdOf(profileId: string): Promise<string> {
    const membership = await emulatorJson<FirestoreDocument>(
        `${DOCUMENTS_URL}/organizationMember/${profileId}`,
        { method: "GET" }
    );
    const organizationId = stringField(membership, "organizationId");
    if (!organizationId) {
        throw new Error(`No membership for profile ${profileId}`);
    }
    return organizationId;
}

type SeedInvitationInput = {
    organizationId: string;
    email: string;
    invitedByUserId: string;
    inviterEmail: string;
};

/**
 * Writes a pending invitation the way the API stores one and answers its token. The suite
 * runs without an email provider, so the link the invitee would receive is built here.
 */
export async function seedInvitation(
    input: SeedInvitationInput
): Promise<string> {
    const token = randomBytes(INVITATION_TOKEN_BYTES).toString("base64url");
    const email = input.email.trim().toLowerCase();
    const id = sha256(`${input.organizationId}:${email}`);
    const now = new Date();
    const at = (date: Date) => ({ timestampValue: date.toISOString() });

    await emulatorJson(`${DOCUMENTS_URL}/organizationInvitation/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
            fields: {
                organizationId: { stringValue: input.organizationId },
                email: { stringValue: email },
                role: { stringValue: "member" },
                tokenHash: { stringValue: sha256(token) },
                invitedByUserId: { stringValue: input.invitedByUserId },
                inviterEmail: { stringValue: input.inviterEmail },
                expiresAt: at(new Date(now.getTime() + INVITATION_TTL_MS)),
                lastSentAt: at(now),
                acceptedAt: { nullValue: null },
                acceptedByUserId: { nullValue: null },
                createdAt: at(now),
                updatedAt: at(now),
                deletedAt: { nullValue: null },
            } satisfies Record<string, FirestoreValue>,
        }),
    });

    return token;
}
