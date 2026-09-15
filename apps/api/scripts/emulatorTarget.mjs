/**
 * The safety interlock for the bootstrap scripts, kept pure so it can be tested
 * without starting an emulator or touching a database.
 *
 * These scripts create accounts with passwords that are written down in the docs. The
 * only thing standing between that and a real Firebase project is the checks below.
 */

const DEMO_PREFIX = "demo-";

/**
 * `||` and not `??`: `.env.example` ships these as `VAR=""`, so an empty value has to
 * read as "not set" — otherwise emptying a variable to opt out would leave the checks
 * below thinking an emulator is configured.
 */
export const readEmulatorTarget = (env = process.env) => ({
    firestoreHost: env.FIRESTORE_EMULATOR_HOST || null,
    authHost: env.FIREBASE_AUTH_EMULATOR_HOST || null,
    projectId:
        env.FIREBASE_ADMIN_PROJECT_ID ||
        env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
        null,
});

/** Returns null when seeding is safe, or the reason to refuse. */
export const refuseSeedReason = (target) => {
    if (!(target.firestoreHost && target.authHost)) {
        return [
            "Refusing to seed: FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST must both be set.",
            "",
            "The seed creates accounts whose passwords are published in docs/SETUP.md, so it only",
            "runs against the emulators. Start them with `pnpm emulators` and copy apps/api/.env.example",
            "to apps/api/.env, which ships both hosts filled in.",
        ].join("\n");
    }

    if (!target.projectId?.startsWith(DEMO_PREFIX)) {
        return [
            `Refusing to seed: the target project is "${target.projectId ?? "(unset)"}".`,
            "",
            `The seed only runs against a "${DEMO_PREFIX}*" project id, which the emulators accept`,
            "without credentials and Google never issues. Set NEXT_PUBLIC_FIREBASE_PROJECT_ID (or",
            "FIREBASE_ADMIN_PROJECT_ID) accordingly — apps/api/.env.example already does.",
        ].join("\n");
    }

    return null;
};

/** No emulator host at all means the script would reach a real Firebase project. */
export const isRealProjectTarget = (target) =>
    !(target.firestoreHost || target.authHost);
