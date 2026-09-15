import { UserType } from "@repo/sdk/src/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { meMock, setAuthorizationHeaderMock } = vi.hoisted(() => ({
    meMock: vi.fn(),
    setAuthorizationHeaderMock: vi.fn(),
}));

vi.mock("@/shared/lib/client", () => ({
    apiClient: {
        setAuthorizationHeader: (...args: unknown[]) =>
            setAuthorizationHeaderMock(...args),
        authApi: { me: (...args: unknown[]) => meMock(...args) },
    },
}));

const { resolveDefaultPostLoginForApp, resolveAppPostLoginPath } = await import(
    "@/shared/lib/postLoginNavigation"
);

const ID_TOKEN = "id-token";

function readCookie(name: string): string | null {
    const match = document.cookie
        .split("; ")
        .find((entry) => entry.startsWith(`${name}=`));
    return match ? match.slice(name.length + 1) : null;
}

function clearCookies() {
    for (const entry of document.cookie.split("; ")) {
        const name = entry.split("=")[0];
        if (name) {
            // biome-ignore lint/suspicious/noDocumentCookie: o teste limpa o mesmo canal que o código de produção escreve
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        }
    }
}

beforeEach(() => {
    vi.clearAllMocks();
    clearCookies();
    window.localStorage.clear();
    window.history.replaceState({}, "", "/pt-br/sign-in");
});

describe("projeção das preferências da conta no sign-in", () => {
    it("grava tema e idioma salvos em cookie e leva ao idioma preferido", async () => {
        meMock.mockResolvedValue({
            type: UserType.COMMON,
            preferences: { theme: "dark", locale: "es" },
        });

        const path = await resolveDefaultPostLoginForApp({
            idToken: ID_TOKEN,
            locale: "pt-br",
        });

        expect(setAuthorizationHeaderMock).toHaveBeenCalledWith(ID_TOKEN);
        expect(readCookie("x-theme")).toBe("dark");
        expect(readCookie("x-locale")).toBe("es");
        expect(path).toBe("/es");
    });

    it("não navega quando o idioma preferido já é o da página", async () => {
        meMock.mockResolvedValue({
            type: UserType.COMMON,
            preferences: { theme: "light", locale: "pt-br" },
        });

        const path = await resolveDefaultPostLoginForApp({
            idToken: ID_TOKEN,
            locale: "pt-br",
        });

        expect(readCookie("x-theme")).toBe("light");
        expect(path).toBeNull();
    });

    it("mantém o tema escolhido neste navegador e ainda assim aplica o idioma", async () => {
        window.localStorage.setItem("theme", "light");
        meMock.mockResolvedValue({
            type: UserType.COMMON,
            preferences: { theme: "dark", locale: "es" },
        });

        const path = await resolveDefaultPostLoginForApp({
            idToken: ID_TOKEN,
            locale: "pt-br",
        });

        expect(window.localStorage.getItem("theme")).toBe("light");
        expect(readCookie("x-theme")).toBeNull();
        expect(readCookie("x-locale")).toBe("es");
        expect(path).toBe("/es");
    });

    it("leva o admin ao painel administrativo no idioma preferido", async () => {
        meMock.mockResolvedValue({
            type: UserType.ADMIN,
            preferences: { theme: "system", locale: "en" },
        });

        const path = await resolveDefaultPostLoginForApp({
            idToken: ID_TOKEN,
            locale: "pt-br",
        });

        expect(path).toBe("/en/admin");
    });

    it("descarta um tema ou idioma fora dos valores suportados", async () => {
        meMock.mockResolvedValue({
            type: UserType.COMMON,
            preferences: { theme: "neon", locale: "fr" },
        });

        const path = await resolveDefaultPostLoginForApp({
            idToken: ID_TOKEN,
            locale: "pt-br",
        });

        expect(readCookie("x-theme")).toBeNull();
        expect(readCookie("x-locale")).toBeNull();
        expect(path).toBeNull();
    });

    it("não grava cookie quando a conta não tem preferências", async () => {
        meMock.mockResolvedValue({ type: UserType.COMMON });

        await resolveDefaultPostLoginForApp({
            idToken: ID_TOKEN,
            locale: "pt-br",
        });

        expect(readCookie("x-theme")).toBeNull();
        expect(readCookie("x-locale")).toBeNull();
    });

    it("não grava cookie quando preferences chega como valor primitivo", async () => {
        meMock.mockResolvedValue({
            type: UserType.COMMON,
            preferences: "dark",
        });

        await resolveDefaultPostLoginForApp({
            idToken: ID_TOKEN,
            locale: "pt-br",
        });

        expect(readCookie("x-theme")).toBeNull();
    });

    it("devolve null quando a leitura do perfil falha", async () => {
        meMock.mockRejectedValue(new Error("api is down"));

        const path = await resolveDefaultPostLoginForApp({
            idToken: ID_TOKEN,
            locale: "pt-br",
        });

        expect(path).toBeNull();
    });
});

describe("resolveAppPostLoginPath", () => {
    it("dá precedência ao redirect pedido na query e ainda assim aplica o tema da conta", async () => {
        window.history.replaceState(
            {},
            "",
            "/pt-br/sign-in?redirect=%2Fpt-br%2Fentities"
        );
        meMock.mockResolvedValue({
            type: UserType.COMMON,
            preferences: { theme: "light", locale: "es" },
        });

        const path = await resolveAppPostLoginPath({
            idToken: ID_TOKEN,
            locale: "pt-br",
            fallbackPath: "/pt-br",
        });

        expect(path).toBe("/pt-br/entities");
        expect(window.localStorage.getItem("theme")).toBe("light");
        expect(readCookie("x-theme")).toBe("light");
        // O idioma vem do caminho pedido, e o proxy reescreve o cookie a cada request:
        // projetá-lo aqui só pintaria um idioma que a própria navegação desfaz.
        expect(readCookie("x-locale")).toBeNull();
    });

    it("recusa um redirect para fora da aplicação", async () => {
        window.history.replaceState(
            {},
            "",
            "/pt-br/sign-in?redirect=https%3A%2F%2Fevil.example.com"
        );

        const path = await resolveAppPostLoginPath({
            idToken: ID_TOKEN,
            locale: "pt-br",
            fallbackPath: "/pt-br",
        });

        expect(path).toBe("/pt-br");
    });

    it("cai no caminho padrão quando o perfil não resolve um destino", async () => {
        meMock.mockResolvedValue({ type: UserType.COMMON });

        const path = await resolveAppPostLoginPath({
            idToken: ID_TOKEN,
            locale: "pt-br",
            fallbackPath: "/pt-br",
        });

        expect(path).toBe("/pt-br");
    });
});
