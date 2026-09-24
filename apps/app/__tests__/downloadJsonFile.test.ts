import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    buildExportFileName,
    downloadJsonFile,
} from "@/shared/lib/downloadJsonFile";

const OBJECT_URL = "blob:http://localhost:3000/abc";

let createdBlobs: Blob[];
let createObjectURL: ReturnType<typeof vi.fn>;
let revokeObjectURL: ReturnType<typeof vi.fn>;
let clicked: HTMLAnchorElement[];

/** jsdom's Blob has no `text()`, so the contents come back through a FileReader. */
function readBlobText(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsText(blob);
    });
}

beforeEach(() => {
    createdBlobs = [];
    clicked = [];
    createObjectURL = vi.fn((blob: Blob) => {
        createdBlobs.push(blob);
        return OBJECT_URL;
    });
    revokeObjectURL = vi.fn();

    vi.stubGlobal("URL", {
        ...URL,
        createObjectURL,
        revokeObjectURL,
    });

    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
        function mockedClick(this: HTMLAnchorElement) {
            clicked.push(this);
        }
    );
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe("buildExportFileName", () => {
    it("carimba a data do download no nome do arquivo", () => {
        const name = buildExportFileName(
            "account-data-export",
            new Date("2026-09-23T20:14:00.000Z")
        );

        expect(name).toBe("account-data-export-2026-09-23.json");
    });
});

describe("downloadJsonFile", () => {
    it("entrega o arquivo com o nome pedido e o tipo JSON", async () => {
        downloadJsonFile("dossie.json", { hello: "world" });

        expect(clicked).toHaveLength(1);
        expect(clicked[0].download).toBe("dossie.json");
        expect(createdBlobs[0].type).toBe("application/json");
        await expect(readBlobText(createdBlobs[0])).resolves.toContain(
            '"hello"'
        );
    });

    it("libera o objectURL depois do clique", () => {
        downloadJsonFile("dossie.json", { hello: "world" });

        expect(createObjectURL).toHaveBeenCalledTimes(1);
        expect(revokeObjectURL).toHaveBeenCalledWith(OBJECT_URL);
    });

    it("libera o objectURL mesmo quando o clique falha", () => {
        vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
            () => {
                throw new Error("navigation blocked");
            }
        );

        expect(() => downloadJsonFile("dossie.json", {})).toThrow(
            "navigation blocked"
        );
        expect(revokeObjectURL).toHaveBeenCalledWith(OBJECT_URL);
    });
});
