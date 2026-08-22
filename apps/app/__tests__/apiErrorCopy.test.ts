import BaseClient from "@repo/sdk/src/client/base";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";

/**
 * The chain an API failure travels: SDK propagates the axios error, the screen wraps it
 * once with the active locale, `handleClientError` reads the copy. It broke silently once
 * — the SDK pre-wrapped, so the second wrap saw a `FormattedError` and every `error.code`
 * degraded to the generic message. These cases fail if anything re-introduces that.
 */

function apiError(status: number, data: unknown): AxiosError {
    const headers = new AxiosHeaders();
    const config = { headers };
    return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, {}, {
        status,
        statusText: "Forbidden",
        headers,
        config,
        data,
    } as never);
}

function transportError(): AxiosError {
    const headers = new AxiosHeaders();
    return new AxiosError("Network Error", "ERR_NETWORK", { headers });
}

function copyFor(error: unknown, locale: "pt-br" | "en" | "es"): string {
    return handleClientError(new FormattedError(error, locale));
}

describe("API error code to user copy", () => {
    const forbidden = () =>
        apiError(HTTP_STATUS.FORBIDDEN, {
            error: { code: "AUTH_REQUEST_IMPERSONATION_READ_ONLY" },
        });

    it("resolves the copy of a known code in every locale", () => {
        expect(copyFor(forbidden(), "pt-br")).toBe(
            "Somente leitura: você está atuando como outro usuário."
        );
        expect(copyFor(forbidden(), "en")).toBe(
            "Read-only: you are acting as another user."
        );
        expect(copyFor(forbidden(), "es")).toBe(
            "Solo lectura: estás actuando como otro usuario."
        );
    });

    it("never answers with the generic fallback for a mapped code", () => {
        expect(copyFor(forbidden(), "pt-br")).not.toBe(
            "Um erro inesperado aconteceu"
        );
    });

    it("keeps translating Firebase auth codes, which never pass through the SDK", () => {
        const firebaseError = {
            code: "auth/invalid-credential",
            message: "Firebase: Error (auth/invalid-credential).",
        };

        expect(copyFor(firebaseError, "pt-br")).toBe(
            "Credenciais inválidas. Verifique e-mail e senha."
        );
        expect(copyFor(firebaseError, "en")).toBe(
            "Invalid credentials. Verify email and password."
        );
    });

    /**
     * An `AxiosError` also carries `code` + `message`, so shape-only duck typing used to
     * route it into the Firebase dictionary and answer with `undefined`.
     */
    it("does not mistake a transport failure for a Firebase auth error", () => {
        const copy = copyFor(transportError(), "pt-br");

        expect(copy).toBe("Um erro inesperado aconteceu");
        expect(copy).not.toContain("Network Error");
    });

    it("falls back to the API message, then to status, when there is no known code", () => {
        expect(
            copyFor(
                apiError(HTTP_STATUS.BAD_REQUEST, { message: "Boom" }),
                "pt-br"
            )
        ).toBe("Boom");
        expect(
            copyFor(
                apiError(HTTP_STATUS.FORBIDDEN, { error: { code: "NOPE" } }),
                "pt-br"
            )
        ).toBe("403 - Forbidden");
    });
});

/**
 * The other half of the chain: whatever the SDK decides to throw is what the screen gets.
 * Formatting it here would strip the response and freeze the language at import time.
 */
describe("SDK error propagation", () => {
    it("rejects with the axios error itself, unformatted", async () => {
        const client = new BaseClient({
            project: "app",
            url: "http://localhost",
            context: "common",
        });
        const thrown = apiError(HTTP_STATUS.FORBIDDEN, {
            error: { code: "AUTH_REQUEST_IMPERSONATION_READ_ONLY" },
        });
        client.restClient.request = () => Promise.reject(thrown);

        const caught = await client
            .request({ url: "/entities", method: "POST" })
            .catch((error: unknown) => error);

        expect(caught).toBe(thrown);
        expect(caught).not.toBeInstanceOf(FormattedError);
        expect(copyFor(caught, "en")).toBe(
            "Read-only: you are acting as another user."
        );
    });
});
