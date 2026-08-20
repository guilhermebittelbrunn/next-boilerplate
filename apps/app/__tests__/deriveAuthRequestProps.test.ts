import { UserRoleLevel } from "@repo/auth/types";
import { describe, expect, it } from "vitest";
import { deriveAuthRequestProps } from "@/shared/lib/authRequestHeaders";

const TIME_ZONE = "America/Sao_Paulo";

describe("deriveAuthRequestProps", () => {
    it("sends a common user as themselves", () => {
        const result = deriveAuthRequestProps({
            uid: "u1",
            profileKind: "common",
            panelRole: UserRoleLevel.COMMON,
            impersonatedUid: null,
            timeZone: TIME_ZONE,
        });

        expect(result.context).toBe("common");
        expect(result.props).toEqual({
            userId: "u1",
            requestUserId: "u1",
            userRole: UserRoleLevel.COMMON,
            requestRole: UserRoleLevel.COMMON,
            userTimezone: TIME_ZONE,
        });
    });

    it("ignores a panel role a common user should not have", () => {
        const result = deriveAuthRequestProps({
            uid: "u1",
            profileKind: "common",
            panelRole: UserRoleLevel.ADMIN,
            impersonatedUid: "target-1",
            timeZone: TIME_ZONE,
        });

        expect(result.context).toBe("common");
        expect(result.props.requestUserId).toBe("u1");
        expect(result.props.userRole).toBe(UserRoleLevel.COMMON);
    });

    it("splits actor and subject while an admin impersonates", () => {
        const result = deriveAuthRequestProps({
            uid: "admin1",
            profileKind: "admin",
            panelRole: UserRoleLevel.COMMON,
            impersonatedUid: "target-1",
            timeZone: TIME_ZONE,
        });

        expect(result.context).toBe("common");
        expect(result.props).toEqual({
            userId: "admin1",
            requestUserId: "target-1",
            userRole: UserRoleLevel.ADMIN,
            requestRole: UserRoleLevel.COMMON,
            userTimezone: TIME_ZONE,
        });
    });

    it("falls back to the admin panel when the common target is missing", () => {
        for (const missing of [null, ""]) {
            const result = deriveAuthRequestProps({
                uid: "admin1",
                profileKind: "admin",
                panelRole: UserRoleLevel.COMMON,
                impersonatedUid: missing,
            });

            expect(result.context).toBe("admin");
            expect(result.props.requestUserId).toBe("admin1");
            expect(result.props.requestRole).toBe(UserRoleLevel.ADMIN);
        }
    });

    it("ignores a leftover target while in the admin panel", () => {
        const result = deriveAuthRequestProps({
            uid: "admin1",
            profileKind: "admin",
            panelRole: UserRoleLevel.ADMIN,
            impersonatedUid: "left-over",
        });

        expect(result.context).toBe("admin");
        expect(result.props.requestUserId).toBe("admin1");
        expect(result.props.requestRole).toBe(UserRoleLevel.ADMIN);
    });

    it("leaves the time zone undefined when the caller has none", () => {
        const result = deriveAuthRequestProps({
            uid: "u1",
            profileKind: "common",
            panelRole: UserRoleLevel.COMMON,
            impersonatedUid: null,
        });

        expect(result.props.userTimezone).toBeUndefined();
    });
});
