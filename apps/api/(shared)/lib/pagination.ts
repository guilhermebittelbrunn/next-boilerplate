const CURSOR_VERSION = 1;

const DOCUMENT_ID_MAX_LENGTH = 1500;

const RESERVED_DOCUMENT_ID_RE = /^__.*__$/;

/** gRPC FAILED_PRECONDITION, the status Firestore uses to refuse an unindexed query. */
const FAILED_PRECONDITION = 9;

const REQUIRES_AN_INDEX_RE = /requires an index/i;
const MENTIONS_INDEX_RE = /index/i;

/**
 * A document id is rejected here, before it reaches `doc(id)`, because the Firestore
 * driver throws on an invalid path instead of answering "not found" — which would turn a
 * forged cursor into a 500.
 */
function isUsableDocumentId(id: string): boolean {
    return (
        id.length > 0 &&
        id.length <= DOCUMENT_ID_MAX_LENGTH &&
        !id.includes("/") &&
        id !== "." &&
        id !== ".." &&
        !RESERVED_DOCUMENT_ID_RE.test(id)
    );
}

export function encodeCursor(id: string): string {
    return Buffer.from(JSON.stringify({ v: CURSOR_VERSION, id })).toString(
        "base64url"
    );
}

export function decodeCursor(raw: string): string | null {
    let parsed: unknown;
    try {
        parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    } catch {
        return null;
    }

    if (typeof parsed !== "object" || parsed === null) {
        return null;
    }

    const { v, id } = parsed as { v?: unknown; id?: unknown };
    if (v !== CURSOR_VERSION || typeof id !== "string") {
        return null;
    }

    return isUsableDocumentId(id) ? id : null;
}

/**
 * Firestore reports a missing composite index as FAILED_PRECONDITION carrying a console
 * link in the message; there is no dedicated error class to match on.
 */
export function isMissingIndexError(error: unknown): boolean {
    if (typeof error !== "object" || error === null) {
        return false;
    }

    const { code, message } = error as { code?: unknown; message?: unknown };
    if (typeof message !== "string") {
        return false;
    }

    if (REQUIRES_AN_INDEX_RE.test(message)) {
        return true;
    }

    const failedPrecondition =
        code === FAILED_PRECONDITION || code === "failed-precondition";

    return failedPrecondition && MENTIONS_INDEX_RE.test(message);
}
