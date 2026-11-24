export async function readCappedBody(
    body: ReadableStream<Uint8Array>,
    maxBytes: number
): Promise<Buffer<ArrayBuffer> | null> {
    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) {
            return Buffer.concat(chunks);
        }
        total += value.byteLength;
        if (total > maxBytes) {
            // Stop reading without cancel(): on Next's Node-backed body, cancelling
            // destroys the underlying Readable and leaves an unhandled AbortError.
            reader.releaseLock();
            return null;
        }
        chunks.push(value);
    }
}
