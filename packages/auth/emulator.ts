/**
 * Single source of truth for "am I talking to the Firebase emulators?".
 *
 * Every Firebase entry point in the repo reads this — the Admin SDK, the browser SDK,
 * the API's Identity Toolkit calls, the CSP and the bootstrap scripts. Deciding this
 * per call site is how one of them ends up writing to the real project in silence.
 *
 * Read from both the server and the browser, so no "server-only" / "use client".
 */

/**
 * The emulators accept any project id prefixed with `demo-` without credentials, and
 * Google never issues one — that pairing is what lets the stack run with no account
 * and no network.
 */
export const DEMO_PROJECT_ID = "demo-next-boilerplate";

/** The Auth emulator accepts any API key; this one exists only to form a valid URL. */
export const DEMO_WEB_API_KEY = "demo-api-key";

/**
 * `||` and not `??` on every read below: `.env.example` ships these as `VAR=""`, and
 * emptying a variable is how a fork opts out. With `??` the empty string survives and
 * reads as "emulating", pointing the whole stack at `http://`.
 */
export const authEmulatorHost = (): string | null =>
    process.env.FIREBASE_AUTH_EMULATOR_HOST ||
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST ||
    null;

export const firestoreEmulatorHost = (): string | null =>
    process.env.FIRESTORE_EMULATOR_HOST || null;

export const authEmulatorOrigin = (): string | null => {
    const host = authEmulatorHost();
    return host ? `http://${host}` : null;
};

export const isEmulated = (): boolean =>
    Boolean(authEmulatorHost() || firestoreEmulatorHost());
