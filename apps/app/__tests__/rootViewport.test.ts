import { themeColor } from "@repo/design-system/lib/themeColor";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@repo/design-system/lib/fonts", () => ({ fonts: "" }));

const { viewport } = await import("@/app/layout");

describe("viewport do layout raiz", () => {
    it("publica o theme-color do design system para claro e escuro", () => {
        expect(viewport).toEqual({ themeColor });
    });
});
