import { beforeEach, describe, expect, it } from "vitest";
import {
    seedThemeIfUnset,
    storeActiveTheme,
    syncThemeCookieWithChoice,
} from "@/shared/lib/themePreference";

function readThemeCookie(): string | null {
    const match = document.cookie
        .split("; ")
        .find((entry) => entry.startsWith("x-theme="));
    return match ? match.slice("x-theme=".length) : null;
}

function clearThemeCookie(): void {
    // biome-ignore lint/suspicious/noDocumentCookie: o teste limpa o mesmo canal que o código de produção escreve
    document.cookie = "x-theme=; Max-Age=0; path=/";
}

describe("theme preference", () => {
    beforeEach(() => {
        window.localStorage.clear();
        clearThemeCookie();
    });

    it("stores an explicit choice in the browser and in the cookie", () => {
        storeActiveTheme("dark");

        expect(window.localStorage.getItem("theme")).toBe("dark");
        expect(readThemeCookie()).toBe("dark");
    });

    it("seeds the account theme when this browser has no choice", () => {
        seedThemeIfUnset("dark");

        expect(window.localStorage.getItem("theme")).toBe("dark");
        expect(readThemeCookie()).toBe("dark");
    });

    it("keeps a choice made in this browser when seeding the account theme", () => {
        storeActiveTheme("light");

        seedThemeIfUnset("dark");

        expect(window.localStorage.getItem("theme")).toBe("light");
        expect(readThemeCookie()).toBe("light");
    });

    it("mirrors the active theme into the cookie so the server paints the same one", () => {
        window.localStorage.setItem("theme", "light");

        syncThemeCookieWithChoice("light");

        expect(readThemeCookie()).toBe("light");
    });

    it("never writes a cookie for a browser that made no choice", () => {
        syncThemeCookieWithChoice("system");

        expect(readThemeCookie()).toBeNull();
        expect(window.localStorage.getItem("theme")).toBeNull();
    });
});
