import FormattedError from "./formattedError";
import { logEvent } from "./log";

function withRequestId(error: FormattedError): string {
    const label = error.translations?.packages.utils.error.requestIdLabel;

    if (!(error.requestId && label)) {
        return error.message;
    }

    return `${error.message} (${label}: ${error.requestId})`;
}

export function handleClientError(error: unknown): string {
    if (error instanceof FormattedError) {
        return withRequestId(error);
    }
    logEvent("request", "client-error");
    return "Um erro inesperado aconteceu";
}
