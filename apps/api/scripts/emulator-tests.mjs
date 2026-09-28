/**
 * Runs the suite that talks to the Firestore and Storage emulators.
 *
 * Emulators already up (`pnpm emulators` in another terminal) are reused, because its
 * hub, logging and UI ports are fixed and a second instance could not start next to it.
 * With none up, `firebase emulators:exec` starts both and stops them afterwards. Half of
 * them up is refused: running against a Firestore emulator whose Storage sibling is
 * missing would fail every storage test with a misleading error.
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HOST = "127.0.0.1";
const PROBE_TIMEOUT_MS = 500;
const DEMO_PROJECT_ID = "demo-next-boilerplate";

const apiRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    ".."
);
const repoRoot = path.resolve(apiRoot, "../..");
const vitestConfig = path.join(apiRoot, "vitest.emulator.config.mts");

export const PARTIAL_EMULATORS_MESSAGE = [
    "The Firestore and Storage emulators must be either both running or both stopped.",
    "",
    "Only one of them answers, which is what a `pnpm emulators` started before the",
    "Storage emulator was added looks like. Stop it and run `pnpm emulators` again,",
    "or stop it and let this suite start its own emulators.",
].join("\n");

/** @param {{ firestoreUp: boolean, storageUp: boolean }} state */
export const planEmulatorRun = ({ firestoreUp, storageUp }) => {
    if (firestoreUp && storageUp) {
        return "reuse";
    }
    if (!(firestoreUp || storageUp)) {
        return "start";
    }
    return "refuse";
};

const readEmulatorPorts = () => {
    const firebaseJson = JSON.parse(
        readFileSync(path.join(repoRoot, "firebase.json"), "utf8")
    );
    return {
        firestore: firebaseJson.emulators.firestore.port,
        storage: firebaseJson.emulators.storage.port,
    };
};

const isListening = (port) =>
    new Promise((resolve) => {
        const socket = net.connect({ host: HOST, port });
        const done = (up) => {
            socket.destroy();
            resolve(up);
        };
        socket.setTimeout(PROBE_TIMEOUT_MS, () => done(false));
        socket.once("connect", () => done(true));
        socket.once("error", () => done(false));
    });

const run = (command, args) =>
    new Promise((resolve) => {
        const child = spawn(command, args, { cwd: apiRoot, stdio: "inherit" });
        child.once("error", (error) => {
            process.stderr.write(`${error.message}\n`);
            resolve(1);
        });
        child.once("exit", (code, signal) => resolve(signal ? 1 : (code ?? 1)));
    });

const main = async () => {
    const ports = readEmulatorPorts();
    const [firestoreUp, storageUp] = await Promise.all([
        isListening(ports.firestore),
        isListening(ports.storage),
    ]);
    const plan = planEmulatorRun({ firestoreUp, storageUp });

    if (plan === "refuse") {
        process.stderr.write(`${PARTIAL_EMULATORS_MESSAGE}\n`);
        return 1;
    }

    if (plan === "reuse") {
        return await run("vitest", ["run", "--config", vitestConfig]);
    }

    return await run("firebase", [
        "emulators:exec",
        "--only",
        "firestore,storage",
        "--project",
        DEMO_PROJECT_ID,
        `vitest run --config "${vitestConfig}"`,
    ]);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    process.exitCode = await main();
}
