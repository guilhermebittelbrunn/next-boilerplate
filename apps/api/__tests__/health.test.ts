import { STATUS_CODES } from "node:http";
import { expect, test } from "vitest";
import { GET } from "../app/(routes)/health/route";

test("Health Check", async () => {
    const response = GET();
    expect(response.status).toBe(STATUS_CODES.OK);
    expect(await response.text()).toBe("OK");
});
