import { getFirestoreAdmin } from "@repo/auth/server";
import { logEvent } from "@repo/shared/utils/helpers/log";

/**
 * A readiness check that outlives the load balancer's own patience is worse than no
 * check: the platform gives up first and reports a timeout instead of an unready
 * process, so the probe has to lose the race on purpose.
 */
export const PROBE_TIMEOUT_MS = 2000;

const PROBE_COLLECTION = "health";
const PROBE_DOCUMENT = "readiness";

type ProbeFailure = "timeout" | "probe-error";

/**
 * Reads a single document that need not exist. The point is the round trip — network,
 * credentials, project — not the content, so nothing has to be seeded for this to work.
 */
async function readCheapDocument(): Promise<void> {
    await getFirestoreAdmin()
        .collection(PROBE_COLLECTION)
        .doc(PROBE_DOCUMENT)
        .get();
}

/**
 * Answers a boolean and nothing else. The reason stays in the log: a public endpoint
 * that names the failing dependency hands an attacker a map of the infrastructure.
 */
export async function probeDatabase(
    timeoutMs: number = PROBE_TIMEOUT_MS
): Promise<boolean> {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const probe = readCheapDocument().then(
        () => null,
        (): ProbeFailure => "probe-error"
    );

    const timeout = new Promise<ProbeFailure>((resolve) => {
        timer = setTimeout(() => resolve("timeout"), timeoutMs);
    });

    try {
        const failure = await Promise.race([probe, timeout]);

        if (failure) {
            logEvent("request", "readiness-failed", { reason: failure });
            return false;
        }

        return true;
    } finally {
        clearTimeout(timer);
    }
}
