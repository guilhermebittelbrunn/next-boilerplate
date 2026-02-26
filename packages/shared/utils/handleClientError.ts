import { FormattedError, isHttpErrorResponse } from "./formattedError";

export function handleClientError(error: unknown): string {
    if (error instanceof FormattedError) {
        return error.message;
    }

    if (isHttpErrorResponse(error)) {
        const message = error.data?.toString();
        if (message) {
            return Array.isArray(message) ? message.join(", ") : message;
        }

        if (error.status) {
            return `${error.status} - ${error.statusText ?? "Erro na requisição"}`;
        }

        return error.data?.toString() ?? "Erro na requisição";
    }

    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === "object" && error !== null && "message" in error) {
        return (error as { message: string }).message;
    }

    console.error("Error", error);
    return "Um erro inesperado aconteceu";
}
