import { describe, expect, it } from "vitest";
import {
    isRealProjectTarget,
    readEmulatorTarget,
    refuseSeedReason,
} from "../scripts/emulatorTarget.mjs";

/**
 * The script reads `process.env` by default, so TypeScript wants the full ProcessEnv
 * shape. These fixtures name only the variables under test.
 */
const envOf = (vars: Record<string, string>) => vars as NodeJS.ProcessEnv;

const EMULATED = {
    FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
    FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-next-boilerplate",
};

const targetOf = (vars: Record<string, string>) =>
    readEmulatorTarget(envOf(vars));

describe("readEmulatorTarget", () => {
    it("reads both hosts and the project id", () => {
        expect(targetOf(EMULATED)).toEqual({
            firestoreHost: "127.0.0.1:8080",
            authHost: "127.0.0.1:9099",
            projectId: "demo-next-boilerplate",
        });
    });

    it("prefers FIREBASE_ADMIN_PROJECT_ID over the public one", () => {
        const target = targetOf({
            ...EMULATED,
            FIREBASE_ADMIN_PROJECT_ID: "demo-other",
        });

        expect(target.projectId).toBe("demo-other");
    });

    it("reads an empty string as absent, which is how .env.example opts out", () => {
        const target = targetOf({
            FIRESTORE_EMULATOR_HOST: "",
            FIREBASE_AUTH_EMULATOR_HOST: "",
            NEXT_PUBLIC_FIREBASE_PROJECT_ID: "",
        });

        expect(target).toEqual({
            firestoreHost: null,
            authHost: null,
            projectId: null,
        });
    });
});

describe("refuseSeedReason", () => {
    it("allows a fully emulated demo target", () => {
        expect(refuseSeedReason(targetOf(EMULATED))).toBeNull();
    });

    it("refuses when no emulator host is configured", () => {
        const reason = refuseSeedReason(
            targetOf({
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-next-boilerplate",
            })
        );

        expect(reason).toContain(
            "FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST"
        );
    });

    it("refuses when only one of the two hosts is set", () => {
        const reason = refuseSeedReason(
            targetOf({
                FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-next-boilerplate",
            })
        );

        expect(reason).not.toBeNull();
    });

    it("refuses when the hosts are present but empty", () => {
        const reason = refuseSeedReason(
            targetOf({
                FIRESTORE_EMULATOR_HOST: "",
                FIREBASE_AUTH_EMULATOR_HOST: "",
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-next-boilerplate",
            })
        );

        expect(reason).not.toBeNull();
    });

    // Belt and braces: even pointed at an emulator host, the target project itself has
    // to be a demo one, so a redirected host cannot reach a live project.
    it("refuses a project id that is not a demo one", () => {
        const reason = refuseSeedReason(
            targetOf({
                ...EMULATED,
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: "next-boilerplate-576d0",
            })
        );

        expect(reason).toContain("next-boilerplate-576d0");
    });

    it("refuses when there is no project id at all", () => {
        const reason = refuseSeedReason(
            targetOf({
                FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
                FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
            })
        );

        expect(reason).not.toBeNull();
    });
});

describe("isRealProjectTarget", () => {
    it("is false when both emulator hosts are set", () => {
        expect(isRealProjectTarget(targetOf(EMULATED))).toBe(false);
    });

    it("is false when only one emulator host is set", () => {
        const target = targetOf({
            FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
        });

        expect(isRealProjectTarget(target)).toBe(false);
    });

    it("is true when no emulator host is set", () => {
        const target = targetOf({
            FIREBASE_ADMIN_PROJECT_ID: "next-boilerplate-576d0",
        });

        expect(isRealProjectTarget(target)).toBe(true);
    });

    it("is true when the hosts are present but empty", () => {
        const target = targetOf({
            FIRESTORE_EMULATOR_HOST: "",
            FIREBASE_AUTH_EMULATOR_HOST: "",
            FIREBASE_ADMIN_PROJECT_ID: "next-boilerplate-576d0",
        });

        expect(isRealProjectTarget(target)).toBe(true);
    });
});
