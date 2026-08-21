import { HTTP_STATUS } from "@repo/shared/utils";
import { expect, test } from "vitest";
import { GET } from "../app/(routes)/health/route";

test("Health Check", async () => {
    const response = GET();
    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(await response.json()).toEqual({ message: "OK" });
});
