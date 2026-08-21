import { UserRoleLevel } from "@repo/auth/types";
import type { UserWithAuthDTO } from "@repo/sdk/src/types";
import { fireEvent, render } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProfileKind } from "@/shared/lib/authRequestHeaders";

const {
    listUsersMock,
    panelMock,
    reloadMock,
    setImpersonatedUserMock,
    setPanelEnvironmentMock,
} = vi.hoisted(() => ({
    listUsersMock: vi.fn(),
    panelMock: vi.fn(),
    reloadMock: vi.fn(),
    setImpersonatedUserMock: vi.fn(),
    setPanelEnvironmentMock: vi.fn(),
}));

vi.mock("@/shared/hooks/useListUsers", () => ({
    useListUsers: () => listUsersMock(),
}));
vi.mock("@/shared/providers/AuthRequestPanelContext", () => ({
    useAuthRequestPanel: () => panelMock(),
}));
vi.mock("next/navigation", () => ({ useParams: () => ({ locale: "pt-br" }) }));
vi.mock("@repo/design-system/hooks/useMobile", () => ({
    useIsMobile: () => false,
}));
vi.mock("@repo/internationalization/client", () => {
    const navbar = {
        environmentLabel: "Ambiente",
        environmentAdmin: "Administração",
        environmentCommon: "Painel do usuário",
        actingAsUserLabel: "Atuando como",
        selectUserPlaceholder: "Selecione o usuário",
    };
    const response = {
        locale: "pt-br",
        dictionary: { apps: { app: { pages: { navbar } } } },
    };
    return {
        getDictionary: () => response,
        getDictionaryForLocale: () => response,
    };
});
vi.mock("@repo/design-system/components/ui", () => ({
    Select: ({
        options,
        value,
        placeholder,
        onValueChange,
    }: {
        options: { value: string; label: string }[];
        value?: string;
        placeholder?: string;
        onValueChange?: (value: string) => void;
    }): ReactElement => (
        <div
            data-placeholder={placeholder ?? ""}
            data-testid="select"
            data-value={value ?? ""}
        >
            {options.map((option) => (
                <button
                    data-value={option.value}
                    key={option.value}
                    onClick={() => onValueChange?.(option.value)}
                    type="button"
                >
                    {option.label}
                </button>
            ))}
        </div>
    ),
}));

const PanelNavbarControls = (
    await import("@/shared/components/ui/PanelNavbarControls")
).default;

type CommonUser = Pick<
    UserWithAuthDTO,
    "reference_id" | "displayName" | "email"
>;

const users: CommonUser[] = [
    { reference_id: "uid-alice", displayName: "Alice", email: "a@b.c" },
    { reference_id: "uid-bruno", displayName: "Bruno", email: "b@b.c" },
];

function givenPanel(panel: {
    profileKind: ProfileKind | null;
    panelRequestRole: UserRoleLevel;
    impersonatedFirebaseUid?: string | null;
    impersonatedLabel?: string | null;
}) {
    panelMock.mockReturnValue({
        impersonatedFirebaseUid: null,
        impersonatedLabel: null,
        ...panel,
        setImpersonatedUser: setImpersonatedUserMock,
        setPanelEnvironment: setPanelEnvironmentMock,
    });
}

function renderControls() {
    const { container } = render(<PanelNavbarControls />);
    return {
        container,
        selects: Array.from(
            container.querySelectorAll<HTMLElement>('[data-testid="select"]')
        ),
    };
}

function pickOption(root: HTMLElement, value: string) {
    const option = root.querySelector<HTMLElement>(`[data-value="${value}"]`);
    if (!option) {
        throw new Error(`option "${value}" is not rendered`);
    }
    fireEvent.click(option);
}

beforeEach(() => {
    listUsersMock.mockReset();
    panelMock.mockReset();
    reloadMock.mockReset();
    setImpersonatedUserMock.mockReset();
    setPanelEnvironmentMock.mockReset();
    listUsersMock.mockReturnValue({ data: users, isLoading: false });
    Object.defineProperty(window, "location", {
        configurable: true,
        value: { reload: reloadMock },
        writable: true,
    });
});

describe("PanelNavbarControls", () => {
    it("renders nothing for a common user", () => {
        givenPanel({
            profileKind: "common",
            panelRequestRole: UserRoleLevel.COMMON,
        });

        const { container, selects } = renderControls();

        expect(container.firstChild).toBe(null);
        expect(selects).toHaveLength(0);
        expect(setImpersonatedUserMock).not.toHaveBeenCalled();
    });

    it("renders only the environment switcher for an admin in the admin panel", () => {
        givenPanel({
            profileKind: "admin",
            panelRequestRole: UserRoleLevel.ADMIN,
        });

        const { container, selects } = renderControls();

        expect(selects).toHaveLength(1);
        expect(selects[0].getAttribute("data-value")).toBe(UserRoleLevel.ADMIN);
        expect(container.querySelector('[data-value="uid-alice"]')).toBe(null);
        expect(setImpersonatedUserMock).not.toHaveBeenCalled();
    });

    it("renders both controls for an admin acting as a common user", () => {
        givenPanel({
            profileKind: "admin",
            panelRequestRole: UserRoleLevel.COMMON,
            impersonatedFirebaseUid: "uid-alice",
            impersonatedLabel: "Alice",
        });

        const { selects } = renderControls();

        expect(selects).toHaveLength(2);
        expect(selects[0].getAttribute("data-value")).toBe(
            UserRoleLevel.COMMON
        );
        expect(selects[1].getAttribute("data-value")).toBe("uid-alice");
        expect(selects[1].getAttribute("data-placeholder")).toBe(
            "Selecione o usuário"
        );
    });

    it("defaults to the first common user when the common panel has no target", () => {
        givenPanel({
            profileKind: "admin",
            panelRequestRole: UserRoleLevel.COMMON,
            impersonatedFirebaseUid: null,
        });

        renderControls();

        expect(setImpersonatedUserMock).toHaveBeenCalledWith(
            "uid-alice",
            "Alice"
        );
    });

    it("defaults to the first common user when the saved target is no longer listed", () => {
        givenPanel({
            profileKind: "admin",
            panelRequestRole: UserRoleLevel.COMMON,
            impersonatedFirebaseUid: "uid-removed",
            impersonatedLabel: "Removed",
        });

        renderControls();

        expect(setImpersonatedUserMock).toHaveBeenCalledWith(
            "uid-alice",
            "Alice"
        );
    });

    it("keeps the saved target when it is still listed", () => {
        givenPanel({
            profileKind: "admin",
            panelRequestRole: UserRoleLevel.COMMON,
            impersonatedFirebaseUid: "uid-bruno",
            impersonatedLabel: "Bruno",
        });

        renderControls();

        expect(setImpersonatedUserMock).not.toHaveBeenCalled();
    });

    it("hands the picked user to the panel instead of reloading the page", () => {
        givenPanel({
            profileKind: "admin",
            panelRequestRole: UserRoleLevel.COMMON,
            impersonatedFirebaseUid: "uid-alice",
            impersonatedLabel: "Alice",
        });

        const { container } = renderControls();
        pickOption(container, "uid-bruno");

        expect(setImpersonatedUserMock).toHaveBeenCalledWith(
            "uid-bruno",
            "Bruno"
        );
        expect(reloadMock).not.toHaveBeenCalled();
    });

    it("switches the environment with a target when entering the common panel", () => {
        givenPanel({
            profileKind: "admin",
            panelRequestRole: UserRoleLevel.ADMIN,
        });

        const { selects } = renderControls();
        pickOption(selects[0], UserRoleLevel.COMMON);

        expect(setPanelEnvironmentMock).toHaveBeenCalledWith(
            UserRoleLevel.COMMON,
            { uid: "uid-alice", label: "Alice" }
        );
        expect(reloadMock).not.toHaveBeenCalled();
    });
});
