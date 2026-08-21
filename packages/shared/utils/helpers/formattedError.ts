/** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: <explanation> */

import type { Locale } from "@repo/internationalization/utils";
import axios from "axios";
import { globalTranslations } from "../../../internationalization/translations/global";
import { HTTP_STATUS } from "./httpStatus";

/**
 * Se houver alguma outra forma de error serem disparados devemos adicionar aqui
 */
export default class FormattedError {
    message: string;
    status: number;
    translations: (typeof globalTranslations)[keyof typeof globalTranslations];

    constructor(error: unknown, locale: Locale = "pt-br") {
        this.translations = globalTranslations[locale];
        this.message = this.formatMessage(error);
        this.status = this.formatStatus(error);
    }

    formatMessage(error: unknown): string {
        const fallbackMessage =
            this.translations?.packages.utils.error.unexpected ??
            "Um erro inesperado aconteceu";

        if (error) {
            if (axios.isAxiosError(error) && error.response) {
                const responseError = error.response;
                const data = responseError.data as
                    | { error?: { code?: string }; message?: string }
                    | undefined;

                const apiCode =
                    data &&
                    typeof data === "object" &&
                    data.error &&
                    typeof data.error.code === "string"
                        ? data.error.code
                        : null;

                if (apiCode) {
                    const apiErrors = this.translations?.packages.utils
                        .apiErrors as Record<string, string> | undefined;
                    const mapped = apiErrors?.[apiCode];
                    if (mapped) {
                        return mapped;
                    }
                }

                if (data?.message && typeof data.message === "string") {
                    return data.message;
                }

                return `${responseError.status} - ${responseError.statusText}`;
            }

            if (this.isFirebaseAuthError(error)) {
                return this.translations?.packages.auth.provider.firebase.error[
                    error.code as keyof typeof this.translations.packages.auth.provider.firebase.error
                ];
            }

            if (error instanceof Error) {
                return error.message;
            }
        }

        return fallbackMessage;
    }

    private isUploadRequest(error: unknown): boolean {
        if (!(axios.isAxiosError(error) && error.config)) {
            return false;
        }

        const config = error.config;

        const contentType =
            config.headers?.["Content-Type"] ||
            config.headers?.["content-type"];

        if (contentType?.includes("multipart/form-data")) {
            return true;
        }

        if (config.data instanceof FormData) {
            return true;
        }

        const uploadKeywords = ["image", "upload", "file", "document"];
        const url = config.url || "";
        return uploadKeywords.some((keyword) =>
            url.toLowerCase().includes(keyword)
        );
    }

    private isFirebaseAuthError(
        error: unknown
    ): error is { code: string; message: string } {
        return (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            typeof (error as { code: unknown }).code === "string" &&
            "message" in error &&
            typeof (error as { message: unknown }).message === "string"
        );
    }

    formatStatus(error: unknown): number {
        const fallbackStatus = 500;

        if (error && axios.isAxiosError(error)) {
            if (error.response) {
                const responseError = error.response;

                if (responseError.status) {
                    return responseError.status;
                }
            }

            if (!error.response && this.isUploadRequest(error)) {
                return HTTP_STATUS.PAYLOAD_TOO_LARGE;
            }
        }

        return fallbackStatus;
    }
}
