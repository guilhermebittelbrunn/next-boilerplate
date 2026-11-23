import { execFileSync, spawn } from "node:child_process";
import {
    closeSync,
    existsSync,
    mkdirSync,
    openSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from "node:fs";
import { connect } from "node:net";
import path from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "@playwright/test";
import {
    isComplete,
    LIGHTHOUSE_VERSION,
    LOCALES,
    PAGE_PATHS,
    renderSummary,
    summarizeReport,
} from "./summary.mjs";

const E2E_ROOT = path.resolve(import.meta.dirname, "..");
const REPO_ROOT = path.resolve(E2E_ROOT, "../..");
const WEB_BUILD_ID = path.join(REPO_ROOT, "apps/web/.next/BUILD_ID");
const SERVER_READY_TIMEOUT_MS = 60_000;
const SERVER_STOP_TIMEOUT_MS = 10_000;
const POLL_INTERVAL_MS = 500;
const REQUEST_TIMEOUT_MS = 5000;
const PORT_PROBE_TIMEOUT_MS = 1000;
const MAX_PORT = 65_535;
const STDERR_TAIL_CHARS = 2000;
const TRAILING_SLASHES = /\/+$/;

class UsageError extends Error {}

const sleep = (ms) =>
    new Promise((resolve) => {
        setTimeout(resolve, ms);
    });

function parseCommandLine() {
    try {
        return parseArgs({
            options: {
                url: { type: "string" },
                locale: { type: "string", default: "pt-br" },
                port: { type: "string", default: "3001" },
                out: { type: "string" },
            },
            strict: true,
        }).values;
    } catch (error) {
        throw new UsageError(error.message);
    }
}

function readOptions() {
    const values = parseCommandLine();
    if (!LOCALES.includes(values.locale)) {
        throw new UsageError(
            `--locale must be one of ${LOCALES.join(", ")}; got "${values.locale}".`
        );
    }
    const port = Number(values.port);
    if (!Number.isInteger(port) || port < 1 || port > MAX_PORT) {
        throw new UsageError(
            `--port must be a TCP port; got "${values.port}".`
        );
    }
    const invokedFrom = process.env.INIT_CWD ?? process.cwd();
    return {
        baseUrl: values.url?.replace(TRAILING_SLASHES, ""),
        locale: values.locale,
        port,
        outDir: values.out
            ? path.resolve(invokedFrom, values.out)
            : path.join(E2E_ROOT, "lighthouse-results"),
    };
}

function resolveBrowser() {
    const executable = process.env.CHROME_PATH || chromium.executablePath();
    if (!existsSync(executable)) {
        throw new UsageError(
            `No browser at ${executable}. Run \`pnpm --filter e2e exec playwright install chromium\` or set CHROME_PATH.`
        );
    }
    return executable;
}

const acceptsConnection = (host, port) =>
    new Promise((resolve) => {
        const socket = connect({ host, port });
        const finish = (answer) => {
            socket.destroy();
            resolve(answer);
        };
        socket.setTimeout(PORT_PROBE_TIMEOUT_MS, () => finish(false));
        socket.once("connect", () => finish(true));
        socket.once("error", () => finish(false));
    });

async function isPortTaken(port) {
    const answers = await Promise.all([
        acceptsConnection("127.0.0.1", port),
        acceptsConnection("::1", port),
    ]);
    return answers.some(Boolean);
}

async function responds(url) {
    try {
        const response = await fetch(url, {
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        return response.ok;
    } catch {
        return false;
    }
}

async function startProductionServer({ port, locale, outDir }, onSpawn) {
    if (!existsSync(WEB_BUILD_ID)) {
        throw new UsageError(
            "apps/web has no production build. Run `pnpm --filter web build` first."
        );
    }
    // `next start` on a taken port fails, and the measurement would then hit whatever
    // already listens there, usually a `next dev` that must never be measured.
    if (await isPortTaken(port)) {
        throw new UsageError(
            `Port ${port} is already in use. Stop that server or pass --port <free port>.`
        );
    }

    const logPath = path.join(outDir, "next-start.log");
    const log = openSync(logPath, "w");
    const server = spawn(
        "pnpm",
        ["--filter", "web", "exec", "next", "start", "-p", String(port)],
        { cwd: REPO_ROOT, detached: true, stdio: ["ignore", log, log] }
    );
    closeSync(log);
    onSpawn(server);

    let exitCode = null;
    server.once("exit", (code) => {
        exitCode = code ?? -1;
    });

    const baseUrl = `http://localhost:${port}`;
    const deadline = Date.now() + SERVER_READY_TIMEOUT_MS;
    while (Date.now() < deadline) {
        if (exitCode !== null) {
            throw new Error(
                `next start exited with code ${exitCode}; see ${path.relative(REPO_ROOT, logPath)}.`
            );
        }
        if (await responds(`${baseUrl}/${locale}`)) {
            return baseUrl;
        }
        await sleep(POLL_INTERVAL_MS);
    }
    throw new Error(
        `next start did not answer ${baseUrl}/${locale} within ${SERVER_READY_TIMEOUT_MS} ms; see ${path.relative(REPO_ROOT, logPath)}.`
    );
}

function signalGroup(server, signal) {
    try {
        process.kill(-server.pid, signal);
    } catch (error) {
        if (error.code !== "ESRCH") {
            throw error;
        }
    }
}

async function stopServer(server) {
    if (server.exitCode !== null || server.signalCode !== null) {
        signalGroup(server, "SIGTERM");
        return;
    }
    const exited = new Promise((resolve) => {
        server.once("exit", resolve);
    });
    // `detached` made the server the leader of its own process group, so the negative
    // pid also reaches the `next start` that pnpm spawned.
    signalGroup(server, "SIGTERM");
    const stopped = await Promise.race([
        exited.then(() => true),
        sleep(SERVER_STOP_TIMEOUT_MS).then(() => false),
    ]);
    if (!stopped) {
        signalGroup(server, "SIGKILL");
    }
}

function runLighthouse(url, outputPath, browser) {
    const args = [
        "-y",
        `lighthouse@${LIGHTHOUSE_VERSION}`,
        url,
        "--form-factor=mobile",
        "--screenEmulation.mobile",
        "--only-categories=performance,accessibility,best-practices,seo",
        "--quiet",
        "--chrome-flags=--headless=new",
        "--output=json",
        `--output-path=${outputPath}`,
    ];
    return new Promise((resolve) => {
        const child = spawn("npx", args, {
            cwd: E2E_ROOT,
            env: { ...process.env, CHROME_PATH: browser },
            stdio: ["ignore", "inherit", "pipe"],
        });
        let stderr = "";
        child.stderr.on("data", (chunk) => {
            stderr = (stderr + chunk).slice(-STDERR_TAIL_CHARS);
        });
        child.once("error", (error) => resolve({ failure: error.message }));
        child.once("close", (code) => {
            if (code === 0) {
                resolve({});
                return;
            }
            const lastLine = stderr.trim().split("\n").at(-1) ?? "";
            resolve({
                failure: `lighthouse exited with code ${code}${lastLine ? `: ${lastLine}` : ""}`,
            });
        });
    });
}

async function measurePage({ baseUrl, locale, pagePath, outDir, browser }) {
    const route = `/${locale}${pagePath}`;
    const outputPath = path.join(
        outDir,
        `${route.slice(1).replaceAll("/", "-")}.json`
    );
    rmSync(outputPath, { force: true });

    process.stderr.write(`Measuring ${baseUrl}${route}\n`);
    const { failure } = await runLighthouse(
        `${baseUrl}${route}`,
        outputPath,
        browser
    );
    if (failure) {
        return { path: route, failure };
    }
    try {
        return {
            path: route,
            summary: summarizeReport(
                JSON.parse(readFileSync(outputPath, "utf8"))
            ),
        };
    } catch (error) {
        return {
            path: route,
            failure: `unreadable report ${path.basename(outputPath)}: ${error.message}`,
        };
    }
}

function currentCommit() {
    try {
        return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
            cwd: REPO_ROOT,
            encoding: "utf8",
        }).trim();
    } catch {
        return "unknown";
    }
}

async function main() {
    const options = readOptions();
    const browser = resolveBrowser();
    mkdirSync(options.outDir, { recursive: true });

    let server = null;
    let interrupted = false;
    // Ctrl+C reaches this process several times at once: from the terminal and again
    // from each pnpm above it. A listener that stays registered keeps the repeats from
    // killing the process before the detached server is stopped.
    const stopOnSignal = async () => {
        if (interrupted) {
            return;
        }
        interrupted = true;
        if (server) {
            await stopServer(server);
        }
        process.exit(1);
    };
    process.on("SIGINT", stopOnSignal);
    process.on("SIGTERM", stopOnSignal);

    try {
        let baseUrl = options.baseUrl;
        if (baseUrl) {
            if (!(await responds(`${baseUrl}/${options.locale}`))) {
                throw new UsageError(
                    `${baseUrl}/${options.locale} did not answer with a 2xx status.`
                );
            }
        } else {
            baseUrl = await startProductionServer(options, (spawned) => {
                server = spawned;
            });
        }

        const rows = [];
        for (const pagePath of PAGE_PATHS) {
            if (interrupted) {
                return 1;
            }
            rows.push(
                await measurePage({
                    baseUrl,
                    locale: options.locale,
                    pagePath,
                    outDir: options.outDir,
                    browser,
                })
            );
        }

        const markdown = renderSummary({
            rows,
            meta: {
                version: LIGHTHOUSE_VERSION,
                date: new Date().toISOString(),
                commit: currentCommit(),
                baseUrl,
                startedServer: server !== null,
            },
        });
        writeFileSync(path.join(options.outDir, "summary.md"), markdown);
        process.stdout.write(markdown);

        const measuredAll = rows.every(
            (row) => row.summary && isComplete(row.summary)
        );
        return measuredAll ? 0 : 1;
    } finally {
        if (server) {
            await stopServer(server);
        }
    }
}

try {
    process.exitCode = await main();
} catch (error) {
    process.stderr.write(
        `${error instanceof UsageError ? "" : "pnpm lighthouse failed: "}${error.message}\n`
    );
    process.exitCode = 1;
}
