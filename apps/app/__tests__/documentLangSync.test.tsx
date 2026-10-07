import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { paramsMock } = vi.hoisted(() => ({
    paramsMock: vi.fn<() => Record<string, string>>(),
}));

vi.mock("next/navigation", () => ({
    useParams: () => paramsMock(),
}));

const { DocumentLangSync } = await import(
    "@/shared/components/DocumentLangSync"
);

beforeEach(() => {
    paramsMock.mockReset();
    document.documentElement.lang = "en";
});

afterEach(() => {
    cleanup();
});

describe("DocumentLangSync", () => {
    it("follows the locale segment across a soft navigation", () => {
        paramsMock.mockReturnValue({ locale: "en" });
        const { rerender } = render(<DocumentLangSync />);
        expect(document.documentElement.lang).toBe("en");

        paramsMock.mockReturnValue({ locale: "es" });
        rerender(<DocumentLangSync />);

        expect(document.documentElement.lang).toBe("es");
    });

    it("keeps the server-rendered value on a route without a locale segment", () => {
        paramsMock.mockReturnValue({});

        render(<DocumentLangSync />);

        expect(document.documentElement.lang).toBe("en");
    });

    it("ignores a segment that is not a supported locale", () => {
        paramsMock.mockReturnValue({ locale: "favicon-novo.png" });

        render(<DocumentLangSync />);

        expect(document.documentElement.lang).toBe("en");
    });
});
