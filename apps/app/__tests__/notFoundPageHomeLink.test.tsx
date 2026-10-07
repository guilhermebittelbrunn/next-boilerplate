import { LOCALE_REQUEST_HEADER } from "@repo/internationalization/utils";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { cookieValueMock, urlLocaleMock, homePathMock } = vi.hoisted(() => ({
    cookieValueMock: vi.fn(),
    urlLocaleMock: vi.fn(),
    homePathMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
    headers: () => {
        const urlLocale = urlLocaleMock();
        return Promise.resolve(
            new Headers(
                urlLocale ? { [LOCALE_REQUEST_HEADER]: urlLocale } : undefined
            )
        );
    },
    cookies: async () => ({
        get: () => {
            const value = cookieValueMock();
            return value ? { value } : undefined;
        },
    }),
}));
vi.mock("@/lib/server/notFoundHome", () => ({
    resolveNotFoundHomePath: (locale: string) => homePathMock(locale),
}));

const { NotFoundPage } = await import("@/shared/components/ui/NotFoundPage");

const renderPage = async () => render(await NotFoundPage());

beforeEach(() => {
    cookieValueMock.mockReset();
    urlLocaleMock.mockReset();
    homePathMock.mockReset();
});

afterEach(() => {
    cleanup();
});

describe("NotFoundPage home action", () => {
    it("renders a single link to the resolved home, with no button around it", async () => {
        cookieValueMock.mockReturnValue("en");
        homePathMock.mockResolvedValue("/en/admin");

        const { container } = await renderPage();

        const links = container.querySelectorAll("a");
        expect(links).toHaveLength(1);
        expect(links[0].getAttribute("href")).toBe("/en/admin");
        expect(links[0].textContent).toBe("Go to home");
        expect(container.querySelector("button")).toBeNull();
        expect(homePathMock).toHaveBeenCalledWith("en");
    });

    it("keeps the icon and the label inside one wrapper so the large size keeps its padding", async () => {
        cookieValueMock.mockReturnValue("pt-br");
        homePathMock.mockResolvedValue("/pt-br");

        const { container } = await renderPage();

        const link = container.querySelector("a");
        expect(link?.children).toHaveLength(1);
        expect(link?.firstElementChild?.tagName).toBe("SPAN");
        expect(link?.querySelector("span > svg")).not.toBeNull();
    });

    it("falls back to the default locale when the cookie is missing", async () => {
        cookieValueMock.mockReturnValue(undefined);
        homePathMock.mockResolvedValue("/pt-br");

        const { container } = await renderPage();

        expect(homePathMock).toHaveBeenCalledWith("pt-br");
        expect(container.querySelector("a")?.textContent).toBe(
            "Ir para o início"
        );
    });

    it("speaks the language of the URL rather than the one in the cookie", async () => {
        urlLocaleMock.mockReturnValue("en");
        cookieValueMock.mockReturnValue("pt-br");
        homePathMock.mockResolvedValue("/en");

        const { container } = await renderPage();

        expect(homePathMock).toHaveBeenCalledWith("en");
        expect(container.querySelector("a")?.textContent).toBe("Go to home");
        expect(container.textContent).toContain("Page not found");
    });
});
