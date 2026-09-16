import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import FormattedError from "../utils/helpers/formattedError";
import { handleClientError } from "../utils/helpers/handleClientError";

const REQUEST_ID = "3f2a1b8c-0f4a-4d0a-9e77-9f5f0a3a1c22";
const UNAUTHORIZED = 401;

function apiError(
    headers: Record<string, string> = {},
    code = "AUTH_INVALID_TOKEN"
): AxiosError {
    const error = new AxiosError("Request failed");
    error.response = {
        data: { error: { code } },
        status: UNAUTHORIZED,
        statusText: "Unauthorized",
        headers,
        config: { headers: new AxiosHeaders() },
    };
    return error;
}

function networkError(): AxiosError {
    return new AxiosError("Network Error", AxiosError.ERR_NETWORK);
}

describe("FormattedError.requestId", () => {
    it("reads the identifier the API stamped on the response", () => {
        const formatted = new FormattedError(
            apiError({ "x-request-id": REQUEST_ID })
        );

        expect(formatted.requestId).toBe(REQUEST_ID);
    });

    it("is null when the response carries no identifier", () => {
        expect(new FormattedError(apiError()).requestId).toBeNull();
    });

    it("is null when the request never reached a server", () => {
        expect(new FormattedError(networkError()).requestId).toBeNull();
    });

    it("ignores an empty header instead of quoting it", () => {
        const formatted = new FormattedError(apiError({ "x-request-id": "" }));

        expect(formatted.requestId).toBeNull();
    });

    it("leaves the translated message untouched", () => {
        const formatted = new FormattedError(
            apiError({ "x-request-id": REQUEST_ID })
        );

        expect(formatted.message).toBe("Sessão inválida ou expirada.");
    });
});

describe("handleClientError with an identifier", () => {
    it("appends the identifier behind the localized label", () => {
        const formatted = new FormattedError(
            apiError({ "x-request-id": REQUEST_ID })
        );

        expect(handleClientError(formatted)).toBe(
            `Sessão inválida ou expirada. (Código do erro: ${REQUEST_ID})`
        );
    });

    it("uses the label of the caller's locale", () => {
        const formatted = new FormattedError(
            apiError({ "x-request-id": REQUEST_ID }),
            "en"
        );

        expect(handleClientError(formatted)).toBe(
            `Invalid or expired session. (Error code: ${REQUEST_ID})`
        );
    });

    /**
     * The degraded path is the default: with no identifier the copy has to be the
     * exact string it was before the header existed — no empty parentheses, no
     * orphan label, no `null` leaking into the alert.
     */
    it("returns the message unchanged when there is no identifier", () => {
        const message = handleClientError(new FormattedError(apiError()));

        expect(message).toBe("Sessão inválida ou expirada.");
        expect(message).not.toContain("(");
        expect(message).not.toContain("null");
        expect(message).not.toContain("undefined");
    });

    it("returns the message unchanged when the API never answered", () => {
        const message = handleClientError(new FormattedError(networkError()));

        expect(message).toBe("Um erro inesperado aconteceu");
        expect(message).not.toContain("(");
    });
});
