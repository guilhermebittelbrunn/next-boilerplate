import { UserRoleLevel } from "@repo/auth/types";
import { describe, expect, it } from "vitest";
import { deriveAuthRequestProps } from "@/shared/lib/authRequestHeaders";

describe("deriveAuthRequestProps", () => {
    it("resolves a common user as themselves in common context", () => {
        const { props, context } = deriveAuthRequestProps({
            uid: "u1",
            profileKind: "common",
            panelRole: UserRoleLevel.COMMON,
            impersonatedUid: null,
        });

        expect(context).toBe("common");
        expect(props).toEqual({
            userId: "u1",
            requestUserId: "u1",
            userRole: UserRoleLevel.COMMON,
            requestRole: UserRoleLevel.COMMON,
        });
    });

    it("requests as the impersonated user when admin uses the common panel", () => {
        const { props, context } = deriveAuthRequestProps({
            uid: "admin1",
            profileKind: "admin",
            panelRole: UserRoleLevel.COMMON,
            impersonatedUid: "target1",
        });

        expect(context).toBe("common");
        expect(props.userId).toBe("admin1");
        expect(props.requestUserId).toBe("target1");
        expect(props.userRole).toBe(UserRoleLevel.ADMIN);
        expect(props.requestRole).toBe(UserRoleLevel.COMMON);
    });

    it("acts as admin when in common panel without an impersonated user", () => {
        const { props, context } = deriveAuthRequestProps({
            uid: "admin1",
            profileKind: "admin",
            panelRole: UserRoleLevel.COMMON,
            impersonatedUid: null,
        });

        expect(context).toBe("admin");
        expect(props.requestUserId).toBe("admin1");
        expect(props.requestRole).toBe(UserRoleLevel.ADMIN);
    });

    it("acts as admin in the admin panel", () => {
        const { context, props } = deriveAuthRequestProps({
            uid: "admin1",
            profileKind: "admin",
            panelRole: UserRoleLevel.ADMIN,
            impersonatedUid: "ignored",
        });

        expect(context).toBe("admin");
        expect(props.requestRole).toBe(UserRoleLevel.ADMIN);
    });
});
