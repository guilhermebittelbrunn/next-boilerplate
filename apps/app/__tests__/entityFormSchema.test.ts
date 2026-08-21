import { globalTranslations } from "@repo/internationalization/translations/global";
import { EntityType } from "@repo/sdk/src/types";
import { describe, expect, it } from "vitest";
import {
    buildEntityFormSchema,
    entityGenreUnset,
} from "@/app/[locale]/(authenticated)/(common)/(pages)/entities/(validations)/entityFormSchema";

const schema = buildEntityFormSchema(globalTranslations["pt-br"]);

const base = {
    name: "Acme",
    description: "",
    type: EntityType.CUSTOMER,
    photo: "",
    genre: entityGenreUnset,
    birthdate: "",
    enabled: true,
};

describe("buildEntityFormSchema", () => {
    it("accepts a valid entity", () => {
        expect(schema.safeParse(base).success).toBe(true);
    });

    it("requires a name", () => {
        expect(schema.safeParse({ ...base, name: "" }).success).toBe(false);
    });

    it("accepts a valid photo URL but rejects a malformed one", () => {
        expect(
            schema.safeParse({
                ...base,
                photo: "https://cdn.example.com/a.png",
            }).success
        ).toBe(true);
        expect(schema.safeParse({ ...base, photo: "not a url" }).success).toBe(
            false
        );
    });

    it("accepts an ISO birthdate and rejects a malformed date", () => {
        expect(
            schema.safeParse({ ...base, birthdate: "2024-01-31" }).success
        ).toBe(true);
        expect(
            schema.safeParse({ ...base, birthdate: "31/01/2024" }).success
        ).toBe(false);
    });
});
