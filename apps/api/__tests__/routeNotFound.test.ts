// @vitest-environment node

import { HTTP_STATUS } from "@repo/shared/utils";
import { describe, expect, it } from "vitest";
import {
    DELETE,
    dynamic,
    GET,
    PATCH,
    POST,
    PUT,
} from "../app/[[...path]]/route";

describe("unknown api routes", () => {
    it.each([
        ["GET", GET],
        ["POST", POST],
        ["PUT", PUT],
        ["PATCH", PATCH],
        ["DELETE", DELETE],
    ])(
        "answers %s with a JSON 404 the app can translate",
        async (_method, handler) => {
            const response = handler();

            expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
            expect(response.headers.get("content-type")).toContain(
                "application/json"
            );
            expect(await response.json()).toEqual({
                error: { code: "ROUTE_NOT_FOUND" },
            });
        }
    );

    it("is evaluated per request instead of being pre-rendered as a 404", () => {
        expect(dynamic).toBe("force-dynamic");
    });
});
