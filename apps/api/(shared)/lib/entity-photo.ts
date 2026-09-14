import type { EntityDTO } from "@repo/sdk/src/types";
import {
    isOwnedBy,
    isStorageConfigured,
    isStorageObjectPath,
    signReadUrl,
} from "./storage";

const ABSOLUTE_URL_RE = /^https?:\/\//i;

export const isAbsoluteHttpUrl = (value: string): boolean =>
    ABSOLUTE_URL_RE.test(value);

/** Empty string means "no photo"; the stored field is nullable, the form value is not. */
export const normalizePhotoReference = (
    value: string | null | undefined
): string | null => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
};

/** An object in the bucket that this owner uploaded — the only kind we sign or delete. */
export const isOwnStorageObject = (value: string, ownerId: string): boolean =>
    isStorageObjectPath(value) && isOwnedBy(value, ownerId);

/**
 * Decides fail-closed: a reference is usable only as an absolute http(s) URL or as an
 * object under the owner's own prefix. Anything else is refused, so pointing a record at
 * someone else's object can never reach the document and be signed on the way back out.
 */
export const isUsablePhotoReference = (
    value: string,
    ownerId: string
): boolean => isAbsoluteHttpUrl(value) || isOwnStorageObject(value, ownerId);

/**
 * `photoUrl` only ever exists on the way out. The document keeps the reference, so an
 * expiring signature can never be written back by an update that spreads the DTO.
 */
export async function withPhotoUrl(entity: EntityDTO): Promise<EntityDTO> {
    if (!entity.photo) {
        return { ...entity, photoUrl: null };
    }

    if (isAbsoluteHttpUrl(entity.photo)) {
        return { ...entity, photoUrl: entity.photo };
    }

    // Signing is refused for anything that is not a well-formed object path, so a value
    // that predates the current validation cannot be turned into a working link.
    if (!(isStorageConfigured() && isStorageObjectPath(entity.photo))) {
        return { ...entity, photoUrl: null };
    }

    try {
        const { url } = await signReadUrl(entity.photo);
        return { ...entity, photoUrl: url };
    } catch {
        // A bucket that refuses to sign is a misconfiguration of one record's image,
        // not a reason to fail the whole read: the row renders without a thumbnail.
        console.warn("[storage] could not sign a read url for an entity photo");
        return { ...entity, photoUrl: null };
    }
}

export const withPhotoUrls = (list: EntityDTO[]): Promise<EntityDTO[]> =>
    Promise.all(list.map(withPhotoUrl));
