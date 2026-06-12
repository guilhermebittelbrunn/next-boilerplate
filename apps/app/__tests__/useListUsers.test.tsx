import { UserType } from "@repo/sdk/src/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const { listMock } = vi.hoisted(() => ({ listMock: vi.fn() }));

vi.mock("@/shared/lib/client", () => ({
    apiClient: { user: { list: () => listMock() } },
}));

const { useListUsers } = await import("@/shared/hooks/useListUsers");

function createWrapper() {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
}

const users = [
    { id: "1", type: UserType.ADMIN },
    { id: "2", type: UserType.COMMON },
    { id: "3", type: UserType.COMMON },
];

const commonUsers = users.filter((u) => u.type === UserType.COMMON);

describe("useListUsers", () => {
    it("returns all users when no type filter is passed", async () => {
        listMock.mockResolvedValue(users);
        const { result } = renderHook(() => useListUsers(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toHaveLength(users.length);
    });

    it("filters by type in memory via select", async () => {
        listMock.mockResolvedValue(users);
        const { result } = renderHook(
            () => useListUsers({ type: UserType.COMMON }),
            { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toHaveLength(commonUsers.length);
        expect(
            result.current.data?.every((u) => u.type === UserType.COMMON)
        ).toBe(true);
    });
});
