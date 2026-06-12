import { UserRoleLevel } from "@repo/auth/types";
import { beforeEach, describe, expect, it } from "vitest";
import { usePanelStore } from "@/shared/stores/panelStore";

describe("usePanelStore", () => {
    beforeEach(() => {
        usePanelStore.setState({
            profileKind: null,
            panelRequestRole: UserRoleLevel.ADMIN,
            impersonatedFirebaseUid: null,
            hydrated: false,
        });
    });

    it("sets the profile kind", () => {
        usePanelStore.getState().setProfileKind("admin");
        expect(usePanelStore.getState().profileKind).toBe("admin");
    });

    it("stores and clears the impersonated uid", () => {
        usePanelStore.getState().setImpersonatedFirebaseUid("u9");
        expect(usePanelStore.getState().impersonatedFirebaseUid).toBe("u9");

        usePanelStore.getState().setImpersonatedFirebaseUid(null);
        expect(usePanelStore.getState().impersonatedFirebaseUid).toBeNull();
    });

    it("switches the panel role", () => {
        usePanelStore.getState().setPanelRequestRole(UserRoleLevel.COMMON);
        expect(usePanelStore.getState().panelRequestRole).toBe(
            UserRoleLevel.COMMON
        );
    });

    it("resets profile and hydration flags", () => {
        usePanelStore.getState().setProfileKind("admin");
        usePanelStore.getState().markHydrated();
        usePanelStore.getState().resetPanel();

        const state = usePanelStore.getState();
        expect(state.profileKind).toBeNull();
        expect(state.hydrated).toBe(false);
    });
});
