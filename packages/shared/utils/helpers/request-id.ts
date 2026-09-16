/**
 * Name of the header the API stamps on every response and forwards to its own
 * handlers. It lives here because both sides read it: the API writes it, and
 * `FormattedError` looks for it on the response the browser received.
 */
export const REQUEST_ID_HEADER = "x-request-id";

export const generateRequestId = (): string => crypto.randomUUID();

export const requestIdFrom = (request: Request): string | null =>
    request.headers.get(REQUEST_ID_HEADER);
