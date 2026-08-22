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

        if (!error) {
            return fallbackMessage;
        }

        const apiMessage = this.apiResponseMessage(error);
        if (apiMessage) {
            return apiMessage;
        }

        const firebaseMessage = this.firebaseAuthMessage(error);
        if (firebaseMessage) {
            return firebaseMessage;
        }

        // A request that never got a response carries an internal axios message
        // ("Network Error", "timeout of 0ms exceeded"), which is not user-facing copy.
        if (axios.isAxiosError(error)) {
            return fallbackMessage;
        }

        if (error instanceof Error) {
            return error.message;
        }

        return fallbackMessage;
    }

    /** Copy for a response the API actually sent: `error.code` first, then its own message. */
    private apiResponseMessage(error: unknown): string | null {
        if (!(axios.isAxiosError(error) && error.response)) {
            return null;
        }

        const response = error.response;
        const data = response.data as
            | { error?: { code?: string }; message?: string }
            | undefined;

        const apiCode =
            typeof data?.error?.code === "string" ? data.error.code : null;

        if (apiCode) {
            const apiErrors = this.translations?.packages.utils.apiErrors as
                | Record<string, string>
                | undefined;
            const mapped = apiErrors?.[apiCode];
            if (mapped) {
                return mapped;
            }
        }

        if (typeof data?.message === "string" && data.message) {
            return data.message;
        }

        return `${response.status} - ${response.statusText}`;
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

    /**
     * Matches on a code the Firebase dictionary actually knows, never on the shape alone:
     * an `AxiosError` also carries `code` + `message` (`ERR_NETWORK`, `ECONNABORTED`) and
     * would otherwise be answered with an undefined translation.
     */
    private firebaseAuthMessage(error: unknown): string | null {
        if (
            typeof error !== "object" ||
            error === null ||
            !("code" in error) ||
            typeof (error as { code: unknown }).code !== "string"
        ) {
            return null;
        }

        const firebaseErrors = this.translations?.packages.auth.provider
            .firebase.error as Record<string, string> | undefined;

        return firebaseErrors?.[(error as { code: string }).code] ?? null;
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
