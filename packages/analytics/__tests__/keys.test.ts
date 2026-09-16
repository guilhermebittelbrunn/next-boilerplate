import { afterEach, describe, expect, it } from "vitest";
import { keys } from "../keys";

const VARIABLE = "NEXT_PUBLIC_GA_MEASUREMENT_ID";

function withMeasurementId(value: string | undefined) {
    if (value === undefined) {
        delete process.env[VARIABLE];
        return;
    }
    process.env[VARIABLE] = value;
}

afterEach(() => {
    withMeasurementId(undefined);
});

describe("keys", () => {
    it("aceita um id de medição do Google", () => {
        withMeasurementId("G-ABC123");

        expect(keys().NEXT_PUBLIC_GA_MEASUREMENT_ID).toBe("G-ABC123");
    });

    it("descarta a string vazia que o .env.example publica", () => {
        withMeasurementId("");

        expect(keys().NEXT_PUBLIC_GA_MEASUREMENT_ID).toBeUndefined();
    });

    it("descarta id sem o prefixo do Google", () => {
        withMeasurementId("UA-123456");

        expect(keys().NEXT_PUBLIC_GA_MEASUREMENT_ID).toBeUndefined();
    });

    it("descarta a variável ausente", () => {
        withMeasurementId(undefined);

        expect(keys().NEXT_PUBLIC_GA_MEASUREMENT_ID).toBeUndefined();
    });
});
