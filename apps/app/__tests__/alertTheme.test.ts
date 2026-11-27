import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { toastMock } = vi.hoisted(() => ({
    toastMock: {
        success: vi.fn(),
        info: vi.fn(),
        warning: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock("sonner", () => ({
    toast: toastMock,
}));

const { useAlert } = await import("@repo/design-system/hooks/useAlert");

beforeEach(() => {
    vi.clearAllMocks();
});

describe("useAlert", () => {
    it.each([
        ["successAlert", "success"],
        ["infoAlert", "info"],
        ["warningAlert", "warning"],
        ["errorAlert", "error"],
    ] as const)(
        "%s opens a Sonner %s toast with the message",
        (alert, kind) => {
            const { result } = renderHook(() => useAlert());

            result.current[alert]("mensagem");

            expect(toastMock[kind]).toHaveBeenCalledWith("mensagem");
            expect(toastMock[kind]).toHaveBeenCalledTimes(1);
        }
    );
});
