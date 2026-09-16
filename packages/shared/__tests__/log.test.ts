import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { logEvent } from "../utils/helpers/log";

const LOG_LINE = /^\[[\w-]+] [\w-]+( [\w]+=[^\s]*)*$/;

const consoleSpies = {
    warn: vi.spyOn(console, "warn").mockImplementation(() => {
        // the one deliberate channel; recorded and inspected below
    }),
    error: vi.spyOn(console, "error").mockImplementation(() => {
        // must stay silent: the helper never escalates
    }),
    log: vi.spyOn(console, "log").mockImplementation(() => {
        // must stay silent
    }),
    info: vi.spyOn(console, "info").mockImplementation(() => {
        // must stay silent
    }),
    debug: vi.spyOn(console, "debug").mockImplementation(() => {
        // must stay silent
    }),
};

const emittedLines = (): string[] =>
    consoleSpies.warn.mock.calls.map((call) => call.join(" "));

beforeEach(() => {
    for (const spy of Object.values(consoleSpies)) {
        spy.mockClear();
    }
});

afterAll(() => {
    vi.restoreAllMocks();
});

describe("logEvent line format", () => {
    it("writes scope, event and pairs as a single argument", () => {
        logEvent("storage", "sign-url-failed", { resource: "avatar" });

        expect(consoleSpies.warn).toHaveBeenCalledTimes(1);
        expect(consoleSpies.warn).toHaveBeenCalledWith(
            "[storage] sign-url-failed resource=avatar"
        );
    });

    it("never spreads across more than one argument", () => {
        logEvent("payments", "webhook-failed", { requestId: "abc" });

        for (const call of consoleSpies.warn.mock.calls) {
            expect(call).toHaveLength(1);
        }
    });

    it("emits an event without fields", () => {
        logEvent("request", "client-error");

        expect(consoleSpies.warn).toHaveBeenCalledWith(
            "[request] client-error"
        );
    });

    it("keeps every line matching the anchored shape", () => {
        logEvent("security", "blocked", {
            reason: "rate-limit",
            path: "/auth/sign-in",
            method: "POST",
        });
        logEvent("auth", "session-revoke-failed", { requestId: null });
        logEvent("email", "skipped");

        for (const line of emittedLines()) {
            expect(line).toMatch(LOG_LINE);
        }
    });

    it("stays on the warn channel and leaves the others silent", () => {
        logEvent("account", "profile-create-failed", { requestId: "r1" });

        expect(consoleSpies.error).not.toHaveBeenCalled();
        expect(consoleSpies.log).not.toHaveBeenCalled();
        expect(consoleSpies.info).not.toHaveBeenCalled();
        expect(consoleSpies.debug).not.toHaveBeenCalled();
    });
});

describe("logEvent field handling", () => {
    it("drops absent fields instead of printing them as undefined", () => {
        logEvent("auth", "profile-create-failed", {
            requestId: undefined,
            attempt: null,
        });

        expect(consoleSpies.warn).toHaveBeenCalledWith(
            "[auth] profile-create-failed"
        );
    });

    it("keeps a falsy value that was actually measured", () => {
        logEvent("request", "readiness-failed", {
            attempts: 0,
            recovered: false,
        });

        expect(consoleSpies.warn).toHaveBeenCalledWith(
            "[request] readiness-failed attempts=0 recovered=false"
        );
    });

    /**
     * A value carrying a newline would otherwise close the entry and open a second one
     * under the attacker's control — a forged line in the middle of the audit trail.
     */
    it("collapses whitespace so a value cannot forge a second line", () => {
        logEvent("storage", "delete-failed", {
            path: "uploads/a\nb\r[security] blocked reason=none\tc d",
        });

        const [line] = emittedLines();

        expect(line.split("\n")).toHaveLength(1);
        expect(line.split("\r")).toHaveLength(1);
        expect(line).toMatch(LOG_LINE);
    });
});

describe("logEvent privacy", () => {
    it("leaves no address in the output of a full recovery flow", () => {
        logEvent("auth", "reset-request-delivery-failed", {
            requestId: "3f2a1b8c",
        });
        logEvent("auth-action-link", "refused", {
            kind: "reset-password",
            code: "auth/internal-error",
        });
        logEvent("auth", "session-revoke-failed", { requestId: "3f2a1b8c" });

        for (const line of emittedLines()) {
            expect(line).not.toContain("@");
        }
    });

    /**
     * `LogFieldValue` excludes objects, so this call does not compile — the cast is
     * how the test reaches the runtime at all. Even forced through, the multi-line
     * stack an `Error` stringifies to must not become several log entries.
     */
    it("contains an error object forced past the signature", () => {
        const error = new Error("jane.smith@example.com is not allowed");

        logEvent("auth", "profile-create-failed", {
            detail: error as unknown as string,
        });

        const [line] = emittedLines();

        expect(consoleSpies.warn).toHaveBeenCalledTimes(1);
        expect(line).not.toContain("\n");
        expect(line).toMatch(LOG_LINE);
    });
});
