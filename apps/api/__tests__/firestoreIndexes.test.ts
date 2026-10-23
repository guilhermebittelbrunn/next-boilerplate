import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

type IndexField = {
    fieldPath: string;
    order?: string;
    arrayConfig?: string;
};
type CompositeIndex = {
    collectionGroup: string;
    queryScope: string;
    fields: IndexField[];
};

const REPO_ROOT = join(import.meta.dirname, "..", "..", "..");

const { indexes } = JSON.parse(
    readFileSync(join(REPO_ROOT, "firestore.indexes.json"), "utf8")
) as { indexes: CompositeIndex[] };

/**
 * The emulator serves any query, indexed or not, so nothing else in the suite notices a
 * missing declaration — it only surfaces against a real project, as a refused query.
 */
describe("firestore.indexes.json", () => {
    it("declares the composite index the paginated entity listing needs", () => {
        const entityIndexes = indexes.filter(
            (index) => index.collectionGroup === "entity"
        );

        expect(entityIndexes).toContainEqual({
            collectionGroup: "entity",
            queryScope: "COLLECTION",
            fields: [
                { fieldPath: "organizationId", order: "ASCENDING" },
                { fieldPath: "deletedAt", order: "ASCENDING" },
                { fieldPath: "createdAt", order: "DESCENDING" },
            ],
        });
    });

    it("declares the indexes the entity summary counts need", () => {
        expect(indexes).toContainEqual({
            collectionGroup: "entity",
            queryScope: "COLLECTION",
            fields: [
                { fieldPath: "organizationId", order: "ASCENDING" },
                { fieldPath: "deletedAt", order: "ASCENDING" },
                { fieldPath: "enabled", order: "ASCENDING" },
            ],
        });
        expect(indexes).toContainEqual({
            collectionGroup: "entity",
            queryScope: "COLLECTION",
            fields: [
                { fieldPath: "organizationId", order: "ASCENDING" },
                { fieldPath: "deletedAt", order: "ASCENDING" },
                { fieldPath: "type", order: "ASCENDING" },
            ],
        });
    });

    /**
     * Listing and counting are scoped by organization: an index keyed by the author has
     * no query left to serve, and keeping it would only cost writes.
     */
    it("no longer keys any entity index by the author", () => {
        const byAuthor = indexes.filter(
            (index) =>
                index.collectionGroup === "entity" &&
                index.fields.some((field) => field.fieldPath === "userId")
        );

        expect(byAuthor).toEqual([]);
    });

    it("declares the index the user summary counts need", () => {
        expect(indexes).toContainEqual({
            collectionGroup: "user",
            queryScope: "COLLECTION",
            fields: [
                { fieldPath: "deletedAt", order: "ASCENDING" },
                { fieldPath: "type", order: "ASCENDING" },
            ],
        });
    });

    it("declares the index the activity recency buckets need", () => {
        expect(indexes).toContainEqual({
            collectionGroup: "user",
            queryScope: "COLLECTION",
            fields: [
                { fieldPath: "deletedAt", order: "ASCENDING" },
                { fieldPath: "lastAccessAt", order: "ASCENDING" },
            ],
        });
    });

    it("declares the index the audit trail's user filter needs", () => {
        expect(indexes).toContainEqual({
            collectionGroup: "auditEvent",
            queryScope: "COLLECTION",
            fields: [
                { fieldPath: "involvedUserIds", arrayConfig: "CONTAINS" },
                { fieldPath: "createdAt", order: "DESCENDING" },
            ],
        });
    });

    it("declares the indexes the notification list and unread count need", () => {
        expect(indexes).toContainEqual({
            collectionGroup: "notification",
            queryScope: "COLLECTION",
            fields: [
                { fieldPath: "userId", order: "ASCENDING" },
                { fieldPath: "createdAt", order: "DESCENDING" },
            ],
        });
        expect(indexes).toContainEqual({
            collectionGroup: "notification",
            queryScope: "COLLECTION",
            fields: [
                { fieldPath: "userId", order: "ASCENDING" },
                { fieldPath: "readAt", order: "ASCENDING" },
            ],
        });
    });

    it("keeps the index the profile lookup already depended on", () => {
        expect(indexes).toContainEqual({
            collectionGroup: "user",
            queryScope: "COLLECTION",
            fields: [
                { fieldPath: "reference_id", order: "ASCENDING" },
                { fieldPath: "deletedAt", order: "ASCENDING" },
            ],
        });
    });
});
