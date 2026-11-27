import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("Testing Library cleanup", () => {
    it("mounts a node into the document", () => {
        render(<p>mounted</p>);

        expect(document.body.childElementCount).toBeGreaterThan(0);
    });

    it("starts the next test with an empty document without a manual cleanup", () => {
        expect(document.body.childElementCount).toBe(0);
    });
});
