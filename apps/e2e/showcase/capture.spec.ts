import { mkdirSync } from "node:fs";
import path from "node:path";
import { type Browser, test } from "@playwright/test";
import { AUTH_STATE, E2E_ROOT } from "../support/paths";
import { SHOWCASE_SHOTS, type ShowcaseShot } from "./shots";

const OUTPUT_DIR =
    process.env.SHOWCASE_OUT ?? path.join(E2E_ROOT, "showcase-results");
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };
const SETTLE_MS = 2500;
const SHOT_TIMEOUT_MS = 600_000;
const NAVIGATION_TIMEOUT_MS = 300_000;

// The dev-tools badge of `next dev` sits over the page corner and would end up in the video.
const HIDE_DEV_OVERLAY = "nextjs-portal { display: none !important; }";

mkdirSync(OUTPUT_DIR, { recursive: true });

async function capture(browser: Browser, shot: ShowcaseShot) {
    const theme = shot.theme ?? "light";
    const context = await browser.newContext({
        viewport: shot.mobile ? MOBILE : DESKTOP,
        deviceScaleFactor: 2,
        isMobile: Boolean(shot.mobile),
        hasTouch: Boolean(shot.mobile),
        locale: "pt-BR",
        colorScheme: theme,
        storageState: shot.signedInAs ? AUTH_STATE[shot.signedInAs] : undefined,
    });
    await context.addInitScript((value) => {
        if (location.protocol.startsWith("http")) {
            localStorage.setItem("theme", value);
        }
    }, theme);

    const page = await context.newPage();
    await page.goto(shot.url, {
        waitUntil: "networkidle",
        timeout: NAVIGATION_TIMEOUT_MS,
    });
    await page.addStyleTag({ content: HIDE_DEV_OVERLAY });
    await page.mouse.move(0, 0);
    await page.waitForTimeout(SETTLE_MS);
    await page.screenshot({
        path: path.join(OUTPUT_DIR, `${shot.name}.png`),
        fullPage: Boolean(shot.fullPage),
    });
    await context.close();
}

test.describe.configure({ mode: "serial" });

for (const shot of SHOWCASE_SHOTS) {
    test(`capture ${shot.name}`, async ({ browser }) => {
        test.setTimeout(SHOT_TIMEOUT_MS);
        await capture(browser, shot);
    });
}
