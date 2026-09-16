import { logEvent } from "./log";
import { REQUEST_ID_HEADER } from "./request-id";

/**
 * Structural on purpose: the shape matches what Next hands `onRequestError`, but this
 * package must not depend on the framework to say so.
 */
type ErrorRequest = Readonly<{
    path: string;
    method: string;
    headers?: Record<string, string | string[] | undefined>;
}>;

type ErrorContext = Readonly<{ routeType: string }>;

/**
 * The runtime hands over the path with its query string attached, and a query string
 * carries whatever the caller typed — a search term, an address, a token. Only the
 * part before the `?` is safe to retain.
 */
function pathWithoutQuery(path: string | undefined): string | undefined {
    return path?.split("?")[0];
}

function headerValue(
    headers: ErrorRequest["headers"],
    name: string
): string | undefined {
    const raw = headers?.[name];
    return Array.isArray(raw) ? raw[0] : raw;
}

/**
 * Unlike a deliberate log, an unhandled error is printed by the runtime anyway, so
 * passing the object through adds correlation rather than exposure. The structured
 * line in front of it is what makes the failure findable by route and matchable
 * against the identifier the caller was shown.
 */
export function reportRequestError(
    error: unknown,
    request: ErrorRequest,
    context: ErrorContext
): void {
    logEvent("request", "failed", {
        method: request?.method,
        path: pathWithoutQuery(request?.path),
        routeType: context?.routeType,
        digest: (error as { digest?: string } | null)?.digest,
        requestId: headerValue(request?.headers, REQUEST_ID_HEADER),
    });

    console.error(error);
}
