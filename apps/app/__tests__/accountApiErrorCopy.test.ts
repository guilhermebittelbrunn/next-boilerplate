import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";

const LOCALES = ["pt-br", "en", "es"] as const;

const GENERIC_COPY: Record<(typeof LOCALES)[number], string> = {
    "pt-br": "Um erro inesperado aconteceu",
    en: "An unexpected error occurred",
    es: "Ocurrió un error inesperado",
};

/** Every code the account area can answer with, the billing tab under `/payments` included. */
const ACCOUNT_ERROR_CODES = [
    "ACCOUNT_NOTHING_TO_UPDATE",
    "ACCOUNT_AVATAR_INVALID",
    "ACCOUNT_CURRENT_PASSWORD_INVALID",
    "ACCOUNT_PASSWORD_UNSUPPORTED",
    "ACCOUNT_UPDATE_FAILED",
    "ACCOUNT_SESSIONS_REVOKE_FAILED",
    "ACCOUNT_EXPORT_IMPERSONATION_FORBIDDEN",
    "ACCOUNT_EXPORT_FAILED",
    "ACCOUNT_DELETION_CONFIRMATION_INVALID",
    "ACCOUNT_DELETION_REAUTH_UNSUPPORTED",
    "ACCOUNT_DELETION_FAILED",
    "USERS_AUTH_RATE_LIMITED",
    "USERS_AUTH_WEAK_PASSWORD",
    "AUTH_PASSWORD_TOO_SHORT",
    "USERS_NOT_FOUND",
    "VALIDATION_FAILED",
    "AUTH_INVALID_TOKEN",
    "COMMON_PANEL_FORBIDDEN",
    "AUTH_REQUEST_IMPERSONATION_READ_ONLY",
    "STORAGE_NOT_CONFIGURED",
    "UPLOAD_FAILED",
    "ACCOUNT_DELETION_BILLING_FAILED",
    "PAYMENTS_NOT_CONFIGURED",
    "PAYMENTS_PLAN_NOT_FOUND",
    "PAYMENTS_SUBSCRIPTION_ALREADY_ACTIVE",
    "PAYMENTS_CUSTOMER_NOT_FOUND",
    "PAYMENTS_PROVIDER_UNAVAILABLE",
] as const;

function apiError(status: number, code: string): AxiosError {
    const headers = new AxiosHeaders();
    const config = { headers };
    return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, {}, {
        status,
        statusText: "Bad Request",
        headers,
        config,
        data: { error: { code } },
    } as never);
}

function copyFor(code: string, locale: (typeof LOCALES)[number]): string {
    return handleClientError(
        new FormattedError(apiError(HTTP_STATUS.BAD_REQUEST, code), locale)
    );
}

describe("copy dos erros da área de conta", () => {
    for (const code of ACCOUNT_ERROR_CODES) {
        it(`traduz ${code} nos três idiomas, sem cair na mensagem genérica`, () => {
            const copies = LOCALES.map((locale) => copyFor(code, locale));

            for (const [index, copy] of copies.entries()) {
                const locale = LOCALES[index];
                expect(copy).toBeTruthy();
                expect(copy).not.toBe(GENERIC_COPY[locale]);
                expect(copy).not.toContain(code);
                expect(copy).not.toContain("400");
            }
        });
    }

    it("mantém a senha atual inválida distinta do limite de tentativas", () => {
        expect(copyFor("ACCOUNT_CURRENT_PASSWORD_INVALID", "pt-br")).not.toBe(
            copyFor("USERS_AUTH_RATE_LIMITED", "pt-br")
        );
    });

    it("nunca devolve o stack trace da API como copy", () => {
        const copy = copyFor("ACCOUNT_UPDATE_FAILED", "pt-br");

        expect(copy).not.toContain("Error:");
        expect(copy).not.toContain("at ");
    });
});
