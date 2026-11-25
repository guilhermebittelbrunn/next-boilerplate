import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";

const PORT = 3999;
const BASE = `http://127.0.0.1:${PORT}`;
const ORIGIN = { origin: BASE, "content-type": "application/json" };
const STARTUP_TIMEOUT_MS = 5000;
const STATUS = { ok: 200, badRequest: 400, forbidden: 403, notFound: 404 };
const serverFile = path.join(import.meta.dirname, "..", "server.mjs");

let outputDir;
let child;

const waitForServer = () =>
    new Promise((resolve, reject) => {
        const timer = setTimeout(
            () => reject(new Error("kickoff server did not start")),
            STARTUP_TIMEOUT_MS
        );
        child.stdout.on("data", () => {
            clearTimeout(timer);
            resolve();
        });
    });

before(async () => {
    outputDir = await mkdtemp(path.join(tmpdir(), "kickoff-"));
    child = spawn(process.execPath, [serverFile], {
        env: {
            ...process.env,
            KICKOFF_PORT: String(PORT),
            KICKOFF_PRODUCT_DIR: outputDir,
        },
    });
    await waitForServer();
});

after(async () => {
    child.kill();
    await rm(outputDir, { recursive: true, force: true });
});

describe("kickoff server", () => {
    it("returns an empty kickoff before the first save", async () => {
        const response = await fetch(`${BASE}/api/kickoff`);
        assert.equal(response.status, STATUS.ok);
        assert.equal((await response.json()).product.name, "");
    });

    it("refuses writes from another origin", async () => {
        const response = await fetch(`${BASE}/api/kickoff`, {
            method: "POST",
            headers: {
                origin: "https://evil.example",
                "content-type": "application/json",
            },
            body: "{}",
        });
        assert.equal(response.status, STATUS.forbidden);
    });

    it("writes kickoff.json and the documents", async () => {
        const response = await fetch(`${BASE}/api/kickoff`, {
            method: "POST",
            headers: ORIGIN,
            body: JSON.stringify({ product: { name: "Agendaí" } }),
        });
        assert.equal(response.status, STATUS.ok);
        const files = await readdir(outputDir);
        for (const name of [
            "kickoff.json",
            "PRODUCT.md",
            "DOMAIN.md",
            "SCREENS.md",
            "DESIGN-PROMPT.md",
        ]) {
            assert.ok(files.includes(name), name);
        }
        const saved = JSON.parse(
            await readFile(path.join(outputDir, "kickoff.json"), "utf8")
        );
        assert.equal(saved.product.name, "Agendaí");
    });

    it("stores a screen design under a slug and replaces the old one", async () => {
        const upload = (extension) =>
            fetch(
                `${BASE}/api/screens/${encodeURIComponent("../Lista Ação")}`,
                {
                    method: "POST",
                    headers: ORIGIN,
                    body: JSON.stringify({
                        extension,
                        data: Buffer.from("x").toString("base64"),
                    }),
                }
            );
        assert.deepEqual(await (await upload("png")).json(), {
            file: "lista-acao.png",
        });
        await upload("webp");
        assert.deepEqual(await readdir(path.join(outputDir, "screens")), [
            "lista-acao.webp",
        ]);
        const served = await fetch(`${BASE}/screens/lista-acao.webp`);
        assert.equal(served.status, STATUS.ok);
        assert.equal(served.headers.get("content-type"), "image/webp");
    });

    it("refuses unknown extensions and paths outside the screens folder", async () => {
        const response = await fetch(`${BASE}/api/screens/tela`, {
            method: "POST",
            headers: ORIGIN,
            body: JSON.stringify({ extension: "svg", data: "" }),
        });
        assert.equal(response.status, STATUS.badRequest);
        const traversal = await fetch(`${BASE}/screens/..%2Fkickoff.json`);
        assert.equal(traversal.status, STATUS.notFound);
    });
});
