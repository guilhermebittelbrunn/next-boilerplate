import { afterEach, describe, expect, it, vi } from "vitest";
import robots from "@/app/robots";

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("landing robots.txt", () => {
    it("lets crawlers read every page, including the ones marked noindex", () => {
        const rules = robots().rules;
        const rule = Array.isArray(rules) ? rules[0] : rules;

        expect(rule?.allow).toBe("/");
        expect(rule?.disallow).toBeUndefined();
    });

    it("points at the absolute sitemap", () => {
        vi.stubEnv("NEXT_PUBLIC_WEB_URL", "https://landing.example");

        expect(robots().sitemap).toBe("https://landing.example/sitemap.xml");
    });
});
