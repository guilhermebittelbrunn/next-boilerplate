import { cleanup, render, screen } from "@testing-library/react";
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    type MockInstance,
    vi,
} from "vitest";

const { useAuthMock, useMyAccountMock } = vi.hoisted(() => ({
    useAuthMock: vi.fn(),
    useMyAccountMock: vi.fn(),
}));

vi.mock("@repo/auth/provider", () => ({ default: () => useAuthMock() }));

vi.mock("@/shared/hooks/useMyAccount", () => ({
    useMyAccount: () => useMyAccountMock(),
}));

const ProfileDropdown = (await import("@/shared/components/ui/ProfileDropdown"))
    .default;

const EMPTY_SRC_WARNING =
    /An empty string \(""\) was passed to the (%s|src) attribute/;

let consoleErrorSpy: MockInstance<Console["error"]>;

beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {
        /* captured for assertions */
    });
    useAuthMock.mockReturnValue({
        user: { displayName: null, email: "ana@example.com", photoURL: null },
        signOut: { mutate: vi.fn() },
    });
    useMyAccountMock.mockReturnValue({
        data: {
            displayName: "Ana Souza",
            email: "ana@example.com",
            avatarUrl: null,
        },
    });
});

afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.unstubAllGlobals();
    cleanup();
});

class LoadedImage extends EventTarget {
    complete = true;
    naturalWidth = 1;
    crossOrigin: string | null = null;
    referrerPolicy = "";
    src = "";
}

function emptySrcWarnings() {
    return consoleErrorSpy.mock.calls.filter((args) =>
        args.some(
            (arg) => typeof arg === "string" && EMPTY_SRC_WARNING.test(arg)
        )
    );
}

describe("ProfileDropdown — avatar sem imagem", () => {
    it('o detector reconhece o aviso que o React emite para <img src="">', () => {
        // biome-ignore lint/performance/noImgElement: the raw element is what triggers the warning under test
        render(<img alt="" height={1} src="" width={1} />);

        expect(emptySrcWarnings()).not.toEqual([]);
    });

    it("mostra as iniciais sem montar <img> nem avisar de src vazio", () => {
        const { container } = render(<ProfileDropdown />);

        expect(screen.getByText("An")).toBeTruthy();
        expect(container.querySelector("img")).toBeNull();

        expect(emptySrcWarnings()).toEqual([]);
    });

    it('não monta <img src=""> quando o avatar carregado deixa de existir', () => {
        vi.stubGlobal("Image", LoadedImage);
        useMyAccountMock.mockReturnValue({
            data: {
                displayName: "Ana Souza",
                email: "ana@example.com",
                avatarUrl: "https://example.com/avatar.png",
            },
        });

        const { container, rerender } = render(<ProfileDropdown />);
        expect(container.querySelector("img")?.getAttribute("src")).toBe(
            "https://example.com/avatar.png"
        );

        const srcChanges = new MutationObserver(vi.fn());
        srcChanges.observe(container, {
            attributeFilter: ["src"],
            subtree: true,
        });
        useMyAccountMock.mockReturnValue({
            data: {
                displayName: "Ana Souza",
                email: "ana@example.com",
                avatarUrl: null,
            },
        });
        rerender(<ProfileDropdown />);
        const srcMutations = srcChanges.takeRecords();
        srcChanges.disconnect();

        expect(srcMutations).toEqual([]);
        expect(container.querySelector("img")).toBeNull();
        expect(screen.getByText("An")).toBeTruthy();
        expect(emptySrcWarnings()).toEqual([]);
    });
});
