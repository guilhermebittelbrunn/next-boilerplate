import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const API_ROOT = path.resolve(__dirname, "..");
const SCANNED_DIRS = ["(shared)", "app"];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);

/**
 * The API talks to Firestore as a trusted service through firebase-admin, which bypasses the
 * deny-all security rules. Any import of the client SDK here would run unauthenticated and be
 * denied by those rules, so it must never come back.
 */
const FORBIDDEN_IMPORTS = [
    /from\s+["']firebase\/firestore["']/,
    /from\s+["']firebase\/app["']/,
];

function collectSourceFiles(dir: string): string[] {
    const files: string[] = [];
    for (const entry of readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) {
            files.push(...collectSourceFiles(full));
            continue;
        }
        if (SOURCE_EXTENSIONS.has(path.extname(full))) {
            files.push(full);
        }
    }
    return files;
}

describe("apps/api Firestore driver", () => {
    const files = SCANNED_DIRS.flatMap((dir) =>
        collectSourceFiles(path.join(API_ROOT, dir))
    );

    it("scans a non-trivial number of source files", () => {
        expect(files.length).toBeGreaterThan(10);
    });

    it("never imports the Firebase client SDK", () => {
        const offenders = files.filter((file) => {
            const source = readFileSync(file, "utf8");
            return FORBIDDEN_IMPORTS.some((pattern) => pattern.test(source));
        });

        expect(offenders.map((file) => path.relative(API_ROOT, file))).toEqual(
            []
        );
    });
});
