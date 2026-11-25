import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import {
    buildDocuments,
    createEmptyKickoff,
    normalizeKickoff,
    PRODUCT_DIR,
    slugify,
} from "./documents.mjs";

const HOST = "127.0.0.1";
const DEFAULT_PORT = 3010;
const JSON_LIMIT_BYTES = 2_097_152;
const UPLOAD_LIMIT_BYTES = 15_728_640;
const STATUS = {
    ok: 200,
    badRequest: 400,
    forbidden: 403,
    notFound: 404,
    methodNotAllowed: 405,
    payloadTooLarge: 413,
    serverError: 500,
};

const repoRoot = path.resolve(import.meta.dirname, "..", "..");
const publicDir = path.join(import.meta.dirname, "public");
const productDir = process.env.KICKOFF_PRODUCT_DIR
    ? path.resolve(process.env.KICKOFF_PRODUCT_DIR)
    : path.join(repoRoot, PRODUCT_DIR);
const screensDir = path.join(productDir, "screens");
const kickoffFile = path.join(productDir, "kickoff.json");

const STATIC_FILES = {
    "/": { file: path.join(publicDir, "index.html"), type: "text/html" },
    "/app.js": {
        file: path.join(publicDir, "app.js"),
        type: "text/javascript",
    },
    "/styles.css": {
        file: path.join(publicDir, "styles.css"),
        type: "text/css",
    },
    "/documents.mjs": {
        file: path.join(import.meta.dirname, "documents.mjs"),
        type: "text/javascript",
    },
};

export const SCREEN_TYPES = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    html: "text/html",
};

const SCREEN_FILE = /^([a-z0-9-]+)\.([a-z]+)$/;
const SCREEN_UPLOAD_ROUTE = /^\/api\/screens\/([^/]+)$/;

export const resolveScreenFile = (fileName) => {
    const match = SCREEN_FILE.exec(fileName);
    if (!(match && SCREEN_TYPES[match[2]])) {
        return null;
    }
    return {
        file: path.join(screensDir, fileName),
        type: SCREEN_TYPES[match[2]],
    };
};

const send = (response, status, body, type = "application/json") => {
    response.writeHead(status, {
        "content-type": `${type}; charset=utf-8`,
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
    });
    response.end(type === "application/json" ? JSON.stringify(body) : body);
};

const readBody = (request, limit) =>
    new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        request.on("data", (chunk) => {
            size += chunk.length;
            if (size > limit) {
                reject(new Error("BODY_TOO_LARGE"));
                request.destroy();
                return;
            }
            chunks.push(chunk);
        });
        request.on("end", () =>
            resolve(Buffer.concat(chunks).toString("utf8"))
        );
        request.on("error", reject);
    });

// The server only listens on 127.0.0.1, but any site open in the same browser can still
// POST to it. Writes are accepted only from the page this server itself serves.
export const isSameOrigin = (request, port) => {
    const origin = request.headers.origin;
    return (
        origin === `http://${HOST}:${port}` ||
        origin === `http://localhost:${port}`
    );
};

const loadKickoff = async () => {
    try {
        return normalizeKickoff(
            JSON.parse(await readFile(kickoffFile, "utf8"))
        );
    } catch (error) {
        if (error.code === "ENOENT") {
            return createEmptyKickoff();
        }
        throw error;
    }
};

const saveKickoff = async (input) => {
    const kickoff = normalizeKickoff(input);
    await mkdir(productDir, { recursive: true });
    await writeFile(kickoffFile, `${JSON.stringify(kickoff, null, 4)}\n`);
    const documents = buildDocuments(kickoff);
    await Promise.all(
        Object.entries(documents).map(([name, content]) =>
            writeFile(path.join(productDir, name), content)
        )
    );
    return ["kickoff.json", ...Object.keys(documents)].map((name) =>
        path.posix.join(PRODUCT_DIR, name)
    );
};

const saveScreen = async (screenId, payload) => {
    const slug = slugify(screenId);
    const extension = String(payload.extension ?? "").toLowerCase();
    if (!(slug && SCREEN_TYPES[extension])) {
        return null;
    }
    await mkdir(screensDir, { recursive: true });
    const existing = await readdir(screensDir);
    await Promise.all(
        existing
            .filter((name) => name.startsWith(`${slug}.`))
            .map((name) => rm(path.join(screensDir, name)))
    );
    const fileName = `${slug}.${extension}`;
    await writeFile(
        path.join(screensDir, fileName),
        Buffer.from(String(payload.data ?? ""), "base64")
    );
    return fileName;
};

const serveFile = async (response, { file, type }, headers = {}) => {
    try {
        const content = await readFile(file);
        response.writeHead(STATUS.ok, {
            "content-type": type,
            "cache-control": "no-store",
            "x-content-type-options": "nosniff",
            ...headers,
        });
        response.end(content);
    } catch {
        send(response, STATUS.notFound, { error: { code: "NOT_FOUND" } });
    }
};

const handleWrite = async (request, response, port, pathname) => {
    if (!isSameOrigin(request, port)) {
        send(response, STATUS.forbidden, {
            error: { code: "FORBIDDEN_ORIGIN" },
        });
        return;
    }
    if (pathname === "/api/kickoff") {
        const body = JSON.parse(await readBody(request, JSON_LIMIT_BYTES));
        send(response, STATUS.ok, { written: await saveKickoff(body) });
        return;
    }
    const upload = SCREEN_UPLOAD_ROUTE.exec(pathname);
    if (upload) {
        const body = JSON.parse(await readBody(request, UPLOAD_LIMIT_BYTES));
        const fileName = await saveScreen(decodeURIComponent(upload[1]), body);
        if (fileName) {
            send(response, STATUS.ok, { file: fileName });
        } else {
            send(response, STATUS.badRequest, {
                error: { code: "INVALID_SCREEN_UPLOAD" },
            });
        }
        return;
    }
    send(response, STATUS.notFound, { error: { code: "NOT_FOUND" } });
};

const handleRead = async (response, pathname) => {
    if (STATIC_FILES[pathname]) {
        await serveFile(response, STATIC_FILES[pathname]);
        return;
    }
    if (pathname === "/api/kickoff") {
        send(response, STATUS.ok, await loadKickoff());
        return;
    }
    if (pathname.startsWith("/screens/")) {
        const screen = resolveScreenFile(pathname.slice("/screens/".length));
        if (screen) {
            // Exported HTML mockups run in an opaque origin, without access to this server.
            await serveFile(response, screen, {
                "content-security-policy": "sandbox allow-scripts",
            });
            return;
        }
    }
    send(response, STATUS.notFound, { error: { code: "NOT_FOUND" } });
};

export const startServer = (port = DEFAULT_PORT) => {
    const server = createServer(async (request, response) => {
        const { pathname } = new URL(request.url, `http://${HOST}:${port}`);
        try {
            if (request.method === "GET") {
                await handleRead(response, pathname);
            } else if (request.method === "POST") {
                await handleWrite(request, response, port, pathname);
            } else {
                send(response, STATUS.methodNotAllowed, {
                    error: { code: "METHOD_NOT_ALLOWED" },
                });
            }
        } catch (error) {
            const code =
                error.message === "BODY_TOO_LARGE"
                    ? "BODY_TOO_LARGE"
                    : "KICKOFF_SERVER_ERROR";
            console.error(`[kickoff] ${code}`, error.message);
            send(
                response,
                code === "BODY_TOO_LARGE"
                    ? STATUS.payloadTooLarge
                    : STATUS.serverError,
                {
                    error: { code },
                }
            );
        }
    });
    server.listen(port, HOST, () => {
        console.info(
            `Kickoff em http://localhost:${port} (salva em ${PRODUCT_DIR}/). Ctrl+C para sair.`
        );
    });
    return server;
};

const renderFromDisk = async () => {
    const written = await saveKickoff(await loadKickoff());
    console.info(`Documentos regenerados: ${written.join(", ")}`);
};

if (process.argv[1] === import.meta.filename) {
    if (process.argv.includes("--render")) {
        await renderFromDisk();
    } else {
        startServer(Number(process.env.KICKOFF_PORT) || DEFAULT_PORT);
    }
}
