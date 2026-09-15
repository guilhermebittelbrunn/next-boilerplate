import { beforeEach, describe, expect, it, vi } from "vitest";

const { isStorageConfiguredMock, signReadUrlMock } = vi.hoisted(() => ({
    isStorageConfiguredMock: vi.fn(),
    signReadUrlMock: vi.fn(),
}));

const UPLOAD_PREFIX = "uploads";
const STORAGE_OBJECT_PATH_RE =
    /^uploads\/[A-Za-z0-9_-]{1,128}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

vi.mock("@/(shared)/lib/storage", () => ({
    isStorageConfigured: () => isStorageConfiguredMock(),
    signReadUrl: (...args: unknown[]) => signReadUrlMock(...args),
    isStorageObjectPath: (value: string) => STORAGE_OBJECT_PATH_RE.test(value),
    isOwnedBy: (path: string, ownerId: string) =>
        path.startsWith(`${UPLOAD_PREFIX}/${ownerId}/`),
}));

const OWNER = "owner-1";
const OWN_OBJECT = `uploads/${OWNER}/11111111-2222-3333-4444-555555555555.webp`;
const OTHER_OBJECT =
    "uploads/someone-else/11111111-2222-3333-4444-555555555555.webp";

describe("avatar reference ownership", () => {
    it("refuses an object that belongs to another account", async () => {
        const { isUsablePhotoReference } = await import(
            "@/(shared)/lib/entity-photo"
        );
        expect(isUsablePhotoReference(OTHER_OBJECT, OWNER)).toBe(false);
        expect(isUsablePhotoReference(OWN_OBJECT, OWNER)).toBe(true);
        expect(
            isUsablePhotoReference("https://cdn.example.com/a.png", OWNER)
        ).toBe(true);
        expect(isUsablePhotoReference("javascript:alert(1)", OWNER)).toBe(
            false
        );
    });
});

describe("withAvatarUrl", () => {
    beforeEach(() => {
        isStorageConfiguredMock.mockReset();
        signReadUrlMock.mockReset();
    });

    it("fills the defaults when the document carries no preferences", async () => {
        isStorageConfiguredMock.mockReturnValue(false);
        const { withAvatarUrl } = await import("@/(shared)/lib/account-avatar");

        const account = await withAvatarUrl({ uid: "u1" });

        expect(account.preferences).toEqual({
            theme: "system",
            locale: "pt-br",
        });
        expect(account.avatar).toBeNull();
        expect(account.avatarUrl).toBeNull();
        expect(account.phone).toBeNull();
    });

    it("keeps the account readable when storage is off", async () => {
        isStorageConfiguredMock.mockReturnValue(false);
        const { withAvatarUrl } = await import("@/(shared)/lib/account-avatar");

        const account = await withAvatarUrl({
            uid: "u1",
            avatar: OWN_OBJECT,
            preferences: { theme: "dark" },
        });

        expect(account.avatar).toBe(OWN_OBJECT);
        expect(account.avatarUrl).toBeNull();
        expect(account.preferences).toEqual({ theme: "dark", locale: "pt-br" });
        expect(signReadUrlMock).not.toHaveBeenCalled();
    });

    it("never throws when signing fails", async () => {
        isStorageConfiguredMock.mockReturnValue(true);
        signReadUrlMock.mockRejectedValue(new Error("bucket is off"));
        const { withAvatarUrl } = await import("@/(shared)/lib/account-avatar");

        const account = await withAvatarUrl({ uid: "u1", avatar: OWN_OBJECT });

        expect(account.avatarUrl).toBeNull();
    });

    it("hands an absolute url back untouched", async () => {
        isStorageConfiguredMock.mockReturnValue(true);
        const { withAvatarUrl } = await import("@/(shared)/lib/account-avatar");

        const account = await withAvatarUrl({
            uid: "u1",
            avatar: "https://cdn.example.com/a.png",
        });

        expect(account.avatarUrl).toBe("https://cdn.example.com/a.png");
        expect(signReadUrlMock).not.toHaveBeenCalled();
    });
});
