/** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: <explanation> */
import axios from "axios";
import { HTTP_STATUS } from "./httpStatus";

const FIREBASE_AUTH_MESSAGES: Record<string, string> = {
    "auth/email-already-in-use": "Este e-mail já está em uso.",
    "auth/invalid-email": "E-mail inválido.",
    "auth/operation-not-allowed": "Operação não permitida.",
    "auth/weak-password": "A senha é muito fraca.",
    "auth/user-disabled": "Esta conta foi desativada.",
    "auth/user-not-found": "Usuário não encontrado.",
    "auth/wrong-password": "Senha incorreta.",
    "auth/invalid-credential":
        "Credenciais inválidas. Verifique e-mail e senha.",
    "auth/too-many-requests": "Muitas tentativas. Tente novamente mais tarde.",
    "auth/network-request-failed": "Erro de conexão. Verifique sua internet.",
    "auth/popup-closed-by-user": "Login cancelado.",
    "auth/cancelled-popup-request": "Login cancelado.",
};

/**
 * Se houver alguma outra forma de error serem disparados devemos adicionar aqui
 */
export default class FormattedError {
    message: string;

    status: number;

    constructor(error: unknown) {
        this.message = this.formatMessage(error);
        this.status = this.formatStatus(error);
    }

    formatMessage(error: unknown): string {
        const fallbackMessage = "Um erro inesperado aconteceu";

        if (error) {
            if (this.isFirebaseAuthError(error)) {
                return FIREBASE_AUTH_MESSAGES[error.code] || error.message;
            }

            if (axios.isAxiosError(error) && error.response) {
                const responseError = error.response;

                if (responseError.data?.message) {
                    return responseError.data.message;
                }

                return `${responseError.status} - ${responseError.statusText}`;
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
