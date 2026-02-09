/**
 * Erro com mensagem e status padronizados para uso no front (Firebase, fetch, Error).
 * Não depende de axios; trata Firebase Auth errors, Error e respostas HTTP genéricas.
 */

const FALLBACK_MESSAGE = "Um erro inesperado aconteceu";
const FALLBACK_STATUS = 500;
const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_PAYLOAD_TOO_LARGE = 413;

/** Firebase Auth errors têm code (ex: "auth/wrong-password") e message */
function isFirebaseAuthError(
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

/** Resposta de erro HTTP com body opcional (ex: fetch + json()) */
export function isHttpErrorResponse(
    error: unknown
): error is { status: number; statusText?: string; data?: unknown } {
    return (
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        typeof (error as { status: unknown }).status === "number"
    );
}

/** Mensagens amigáveis para códigos comuns do Firebase Auth */
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

export default class FormattedError {
    message: string;
    status: number;

    constructor(error: unknown) {
        this.message = this.formatMessage(error);
        this.status = this.formatStatus(error);
    }

    static create(error: unknown): FormattedError {
        return new FormattedError(error);
    }

    /** biome-ignore lint/complexity/noExcessiveCognitiveComplexity: formatMessage handles multiple error shapes */
    formatMessage(error: unknown): string {
        if (isFirebaseAuthError(error)) {
            const friendly =
                FIREBASE_AUTH_MESSAGES[error.code] ||
                error.message ||
                FALLBACK_MESSAGE;
            return friendly;
        }

        if (error instanceof Error) {
            return error.message || FALLBACK_MESSAGE;
        }

        if (isHttpErrorResponse(error)) {
            if (error.status === HTTP_PAYLOAD_TOO_LARGE) {
                return "Tamanho do arquivo muito grande.";
            }
            if (typeof error.data === "string") {
                return error.data;
            }
            if (
                error.data &&
                typeof error.data === "object" &&
                "message" in error.data
            ) {
                const msg = (error.data as { message: unknown }).message;
                if (Array.isArray(msg)) {
                    return msg.join(", ");
                }
                if (typeof msg === "string") {
                    return msg;
                }
            }
            return `${error.status} - ${error.statusText || "Erro na requisição"}`;
        }

        return FALLBACK_MESSAGE;
    }

    formatStatus(error: unknown): number {
        if (isFirebaseAuthError(error)) {
            const code = error.code;
            if (
                code === "auth/invalid-credential" ||
                code === "auth/wrong-password" ||
                code === "auth/user-not-found" ||
                code === "auth/user-disabled"
            ) {
                return HTTP_UNAUTHORIZED;
            }
            if (code === "auth/too-many-requests") {
                return HTTP_TOO_MANY_REQUESTS;
            }
            return HTTP_BAD_REQUEST;
        }

        if (isHttpErrorResponse(error) && error.status >= HTTP_BAD_REQUEST) {
            return error.status;
        }

        return FALLBACK_STATUS;
    }
}
