import { randomUUID } from "node:crypto";
import {
    DEMO_STORAGE_BUCKET,
    isEmulated,
    storageEmulatorHost,
} from "@repo/auth/emulator";
import { getStorageAdmin } from "@repo/auth/server";
import { logEvent } from "@repo/shared/utils/helpers/log";
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
 * Emulated Auth or Firestore without the Storage emulator keeps storage off: a bucket
 * name still filled in would be reached with Application Default Credentials, silently,
 * and real objects would land in a real bucket. With the Storage emulator every call goes
 * to it under the demo bucket, so no real bucket name is ever used in that mode.
 */
export const isStorageConfigured = (): boolean =>
    storageEmulatorHost() !== null ||
    (Boolean(env.FIREBASE_STORAGE_BUCKET) && !isEmulated());

const bucketName = (): string =>
    storageEmulatorHost()
        ? DEMO_STORAGE_BUCKET
        : (env.FIREBASE_STORAGE_BUCKET as string);

const bucket = () => getStorageAdmin().bucket(bucketName());

export const buildObjectPath = (ownerId: string, extension: string): string =>
    `${UPLOAD_PREFIX}/${ownerId}/${randomUUID()}.${extension}`;

export const isStorageObjectPath = (value: string): boolean =>
    STORAGE_OBJECT_PATH_RE.test(value);

/**
 * Everything an owner ever uploaded lives under this one prefix, whatever the resource,
 * which is what lets an erasure sweep by prefix instead of gaining a step per feature.
 */
export const ownerPrefix = (ownerId: string): string =>
    `${UPLOAD_PREFIX}/${ownerId}/`;

export const isOwnedBy = (path: string, ownerId: string): boolean =>
    path.startsWith(ownerPrefix(ownerId));

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
    const emulatorHost = storageEmulatorHost();

    // The emulator checks no signature, and signing needs a private key the demo project
    // does not have: without one, the library asks Google's IAM API to sign instead.
    if (emulatorHost) {
        return {
            url: `http://${emulatorHost}/${DEMO_STORAGE_BUCKET}/${path}`,
            expiresAt: new Date(expires).toISOString(),
        };
    }

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
        logEvent("storage", "delete-failed", { path });
    }
}

export async function listObjectPaths(prefix: string): Promise<string[]> {
    const [files] = await bucket().getFiles({ prefix });
    return files.map((file) => file.name);
}

/**
 * Lists before deleting so the caller learns how many objects went. `deleteFiles` would
 * do the sweep in one call but reports nothing, and an erasure that cannot say what it
 * removed is not worth much as a record.
 */
export async function deleteObjectsByPrefix(prefix: string): Promise<number> {
    const [files] = await bucket().getFiles({ prefix });

    await Promise.all(
        files.map((file) => file.delete({ ignoreNotFound: true }))
    );

    return files.length;
}
