/**
 * Next logs a failed `register` and keeps listening, answering every route with a 500,
 * so a health check that only probes the port sees a healthy server. Ending the process
 * turns a production misconfiguration into a crash the platform reports; outside
 * production the error is only rethrown. Lives apart from `instrumentation.ts` because that
 * file is also bundled for the Edge runtime, where `process.exit` does not exist.
 */
export async function bootOrExit(prepare: () => Promise<void>): Promise<void> {
    try {
        await prepare();
    } catch (error) {
        if (process.env.NODE_ENV !== "production") {
            throw error;
        }
        console.error(
            `[boot] ${error instanceof Error ? error.message : "unknown failure"}`
        );
        process.exit(1);
    }
}
