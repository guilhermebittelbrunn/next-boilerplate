import { HTTP_STATUS } from "@repo/shared/utils";
import { expect, test } from "vitest";
import { dynamic, GET } from "../app/(routes)/health/route";

test("Health Check", async () => {
    const response = GET();
    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(await response.json()).toEqual({ message: "OK" });
});

/**
 * Pre-rendered, the answer is decided at build time and the endpoint reports a healthy
 * process forever — including for a process that is no longer running.
 */
test("liveness is evaluated per request, never frozen at build time", () => {
    expect(dynamic).toBe("force-dynamic");
});
