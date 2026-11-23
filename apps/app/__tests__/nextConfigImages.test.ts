// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const GOOGLE_AVATAR_PATTERN = {
    protocol: "https",
    hostname: "lh3.googleusercontent.com",
};

async function loadImagesConfig(bucket: string | undefined) {
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", bucket);
    vi.resetModules();
    return (await import("@/next.config")).default.images;
}

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("app image optimizer hosts", () => {
    it("serves only the product bucket from Cloud Storage", async () => {
        const images = await loadImagesConfig("demo.appspot.com");

        expect(images?.remotePatterns).toEqual([
            GOOGLE_AVATAR_PATTERN,
            {
                protocol: "https",
                hostname: "storage.googleapis.com",
                pathname: "/demo.appspot.com/**",
            },
        ]);
    });

    it("trims the bucket name before building the path", async () => {
        const images = await loadImagesConfig("  demo.appspot.com  ");

        expect(images?.remotePatterns).toContainEqual(
            expect.objectContaining({ pathname: "/demo.appspot.com/**" })
        );
    });

    it.each([
        ["absent", undefined],
        ["empty, the way the example env ships it", ""],
        ["only whitespace", "   "],
    ])(
        "leaves Cloud Storage out when the bucket is %s",
        async (_label, bucket) => {
            const images = await loadImagesConfig(bucket);

            expect(images?.remotePatterns).toEqual([GOOGLE_AVATAR_PATTERN]);
        }
    );

    it("declares no host through the deprecated domains list", async () => {
        const images = await loadImagesConfig("demo.appspot.com");

        expect(images?.domains).toBeUndefined();
    });
});
