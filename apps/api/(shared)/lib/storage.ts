import { randomUUID } from "node:crypto";
import { isEmulated } from "@repo/auth/emulator";
import { getStorageAdmin } from "@repo/auth/server";
import { env } from "@/env";

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
/**
 * Long enough to cover reading a page whose payload was prefetched on the server,
 * short enough that a leaked link stops working while it still matters.
 */
const SIGNED_URL_TTL_MINUTES = 15;
const SIGNED_URL_TTL_MS =
    SIGNED_URL_TTL_MINUTES * SECONDS_PER_MINUTE * MS_PER_SECOND;
const UPLOAD_PREFIX = "uploads";

/**
 * Owner segment is the Firestore profile id, object name is a v4 UUID and the extension
 * comes from the sniffed type — nothing the client sends reaches the path.
 */
const STORAGE_OBJECT_PATH_RE =
    /^uploads\/[A-Za-z0-9_-]{1,128}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

/**
 * There is no Cloud Storage emulator in this setup, so an emulated stack with a bucket
 * name still filled in would write objects into the real bucket — with Application
 * Default Credentials, silently. Reporting storage as unconfigured keeps every read and
 * write inside the emulated boundary; the panel already degrades to the photo URL field.
 */
export const isStorageConfigured = (): boolean =>
    Boolean(env.FIREBASE_STORAGE_BUCKET) && !isEmulated();

const bucket = () =>
    getStorageAdmin().bucket(env.FIREBASE_STORAGE_BUCKET as string);

export const buildObjectPath = (ownerId: string, extension: string): string =>
    `${UPLOAD_PREFIX}/${ownerId}/${randomUUID()}.${extension}`;

export const isStorageObjectPath = (value: string): boolean =>
    STORAGE_OBJECT_PATH_RE.test(value);

export const isOwnedBy = (path: string, ownerId: string): boolean =>
    path.startsWith(`${UPLOAD_PREFIX}/${ownerId}/`);

export async function putObject(
    path: string,
    body: Buffer,
    contentType: string
): Promise<void> {
    await bucket()
        .file(path)
        .save(body, {
            contentType,
            resumable: false,
            metadata: { cacheControl: "private, max-age=0, no-store" },
        });
}

/**
 * The service account carries a private key, so a V4 signature is computed locally:
 * no round trip and no `Service Account Token Creator` role to grant.
 */
export async function signReadUrl(
    path: string
): Promise<{ url: string; expiresAt: string }> {
    const expires = Date.now() + SIGNED_URL_TTL_MS;
    const [url] = await bucket().file(path).getSignedUrl({
        version: "v4",
        action: "read",
        expires,
    });

    return { url, expiresAt: new Date(expires).toISOString() };
}

/** Removing the superseded object must never fail the save the user just made. */
export async function deleteObjectQuietly(path: string): Promise<void> {
    try {
        await bucket().file(path).delete({ ignoreNotFound: true });
    } catch {
        console.warn(`[storage] delete failed path=${path}`);
    }
}
