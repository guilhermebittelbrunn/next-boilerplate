const JSON_INDENT = 2;

export function buildExportFileName(prefix: string, at: Date): string {
    return `${prefix}-${at.toISOString().slice(0, "YYYY-MM-DD".length)}.json`;
}

/**
 * Assembles the file in the browser instead of letting the API serve it with
 * `Content-Disposition`: the SDK authenticates with a bearer header, and a plain browser
 * navigation to the API would carry no credential at all.
 */
export function downloadJsonFile(filename: string, payload: unknown): void {
    const blob = new Blob([JSON.stringify(payload, null, JSON_INDENT)], {
        type: "application/json",
    });
    const objectUrl = URL.createObjectURL(blob);

    try {
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = filename;
        anchor.click();
    } finally {
        // Held only for the duration of the click: the blob stays in memory until the
        // URL is released, and this one carries the whole account.
        URL.revokeObjectURL(objectUrl);
    }
}
