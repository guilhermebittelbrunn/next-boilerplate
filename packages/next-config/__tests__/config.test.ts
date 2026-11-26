import { describe, expect, it, vi } from "vitest";

vi.mock("@next/bundle-analyzer", () => ({
    default: () => (sourceConfig: unknown) => sourceConfig,
}));

const { config } = await import("../index");

describe("shared Next config", () => {
    it("does not announce the framework in an X-Powered-By header", () => {
        expect(config.poweredByHeader).toBe(false);
    });

    it("does not let next dev write AGENTS.md into the apps", () => {
        expect(config.agentRules).toBe(false);
    });
});
