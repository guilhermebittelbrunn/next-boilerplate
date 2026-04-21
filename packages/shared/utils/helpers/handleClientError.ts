import FormattedError from "./formattedError";

export function handleClientError(error: unknown): string {
    if (error instanceof FormattedError) {
        return error.message;
    }
    console.error("Error", error);
    return "Um erro inesperado aconteceu";
}
