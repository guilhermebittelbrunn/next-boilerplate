import { cleanup, render } from "@testing-library/react";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { profileDropdownPropsMock, redirectMock, resolvePanelSnapshotMock } =
    vi.hoisted(() => ({
        profileDropdownPropsMock: vi.fn(),
        redirectMock: vi.fn(),
        resolvePanelSnapshotMock: vi.fn(),
    }));

vi.mock("@/shared/components/ui/ProfileDropdown", () => ({
    default: (props: { accountPath?: string }) => {
        profileDropdownPropsMock(props);
        return null;
    },
}));
vi.mock("@/shared/components/ui/LanguageSwitcher", () => ({
    LanguageSwitcher: () => null,
}));
vi.mock("@/shared/components/ui/PanelNavbarControls", () => ({
    default: () => null,
}));
vi.mock("@repo/design-system/components/ui/mode-toggle", () => ({
    ModeToggle: () => null,
}));
vi.mock("@repo/design-system/components/ui/sidebar", () => ({
    SidebarTrigger: () => null,
    SidebarProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/env", () => ({ env: { ARCJET_KEY: "" } }));
vi.mock("@repo/security", () => ({ secure: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/lib/server/requireAdmin", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/server/panelSnapshot", () => ({
    resolvePanelSnapshot: () => resolvePanelSnapshotMock(),
}));
vi.mock("@/shared/lib/panelState", () => ({
    isImpersonatingSnapshot: (snapshot: { impersonating: boolean }) =>
        snapshot.impersonating,
}));
vi.mock("@/lib/server/sidebarState", () => ({
    resolveSidebarDefaultOpen: () => true,
}));
vi.mock("@/app/[locale]/(authenticated)/(admin)/admin/sidebar", () => ({
    SidebarAdmin: ({ children }: { children: ReactNode }) => children,
}));

const Navbar = (await import("@/shared/components/ui/Navbar")).default;
const { default: AdminLayout } = await import(
    "@/app/[locale]/(authenticated)/(admin)/admin/layout"
);

function findElementOfType(
    node: ReactNode,
    type: unknown
): ReactElement<Record<string, unknown>> | undefined {
    if (!isValidElement<{ children?: ReactNode }>(node)) {
        return;
    }
    if (node.type === type) {
        return node as ReactElement<Record<string, unknown>>;
    }
    const children = ([] as ReactNode[]).concat(node.props.children ?? []);
    for (const child of children) {
        const found = findElementOfType(child, type);
        if (found) {
            return found;
        }
    }
    return;
}

beforeEach(() => {
    vi.clearAllMocks();
    resolvePanelSnapshotMock.mockResolvedValue({ impersonating: false });
});

afterEach(cleanup);

describe("Navbar — destino de Minha conta", () => {
    it("repassa o accountPath recebido ao menu do avatar", () => {
        render(<Navbar accountPath="/admin/account" />);

        expect(profileDropdownPropsMock).toHaveBeenLastCalledWith({
            accountPath: "/admin/account",
        });
    });

    it("deixa o menu do avatar no destino padrão quando não recebe accountPath", () => {
        render(<Navbar />);

        expect(profileDropdownPropsMock).toHaveBeenLastCalledWith({
            accountPath: undefined,
        });
    });
});

describe("layout do painel admin", () => {
    it("aponta Minha conta da navbar para a conta do admin", async () => {
        const tree = await AdminLayout({
            children: null,
            params: Promise.resolve({ locale: "pt-br" }),
        });

        const navbar = findElementOfType(tree, Navbar);
        expect(navbar?.props.accountPath).toBe("/admin/account");
        expect(redirectMock).not.toHaveBeenCalled();
    });

    it("manda o admin personificando para a raiz do painel comum", async () => {
        resolvePanelSnapshotMock.mockResolvedValue({ impersonating: true });

        await AdminLayout({
            children: null,
            params: Promise.resolve({ locale: "en" }),
        });

        expect(redirectMock).toHaveBeenCalledWith("/en");
    });
});
