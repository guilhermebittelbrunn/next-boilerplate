import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUserMock } = vi.hoisted(() => ({
    getCurrentUserMock: vi.fn(),
}));

vi.mock("../server", () => ({
    getCurrentUser: (...args: unknown[]) => getCurrentUserMock(...args),
}));

const { authMiddleware } = await import("../middleware");

const PROTECTED_URL = "http://localhost:3000/(authenticated)/dashboard";
const PUBLIC_URL = "http://localhost:3000/pt-br/sign-in";

const USER = { uid: "uid-1", email: "qa-middleware@example.com" };

const STATUS_OK = 200;
const STATUS_TEMPORARY_REDIRECT = 307;

function request(url: string, headers?: Record<string, string>) {
    return new NextRequest(url, headers ? { headers } : undefined);
}

function requestWithCookie(url: string, token: string) {
    return request(url, { cookie: `access-token=${token}` });
}

beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue(USER);
});

describe("authMiddleware — rotas públicas", () => {
    it("não verifica o token quando a rota não é protegida", async () => {
        const response = await authMiddleware()(request(PUBLIC_URL));

        expect(getCurrentUserMock).not.toHaveBeenCalled();
        expect(response.headers.get("x-middleware-next")).toBe("1");
    });

    it("não resolve o middleware seguinte quando ele não é informado", async () => {
        const response = await authMiddleware()(request(PUBLIC_URL));

        expect(response.status).toBe(STATUS_OK);
        expect(
            response.headers.get("x-middleware-override-headers")
        ).toBeNull();
    });

    it("delega para o middleware seguinte sem autenticar", async () => {
        const nextMiddleware = vi.fn(
            (_request: NextRequest) =>
                new NextResponse(null, { headers: { "x-from-next": "yes" } })
        );

        const response = await authMiddleware(nextMiddleware)(
            request(PUBLIC_URL)
        );

        expect(getCurrentUserMock).not.toHaveBeenCalled();
        expect(nextMiddleware).toHaveBeenCalledTimes(1);
        expect(response.headers.get("x-from-next")).toBe("yes");
    });
});

describe("authMiddleware — factory versus middleware", () => {
    it("invoca a função sem parâmetros como factory antes de repassar a request", async () => {
        const produced = vi.fn(
            (_request: NextRequest) =>
                new NextResponse(null, { headers: { "x-from": "factory" } })
        );
        const factory = vi.fn(() => produced);

        const response = await authMiddleware(factory)(request(PUBLIC_URL));

        expect(factory).toHaveBeenCalledTimes(1);
        expect(factory).toHaveBeenCalledWith();
        expect(produced).toHaveBeenCalledTimes(1);
        expect(produced.mock.calls[0][0].nextUrl.pathname).toBe(
            "/pt-br/sign-in"
        );
        expect(response.headers.get("x-from")).toBe("factory");
    });

    it("chama diretamente a função que declara a request como parâmetro", async () => {
        const middleware = vi.fn(
            (_request: NextRequest) =>
                new NextResponse(null, { headers: { "x-from": "middleware" } })
        );

        const response = await authMiddleware(middleware)(request(PUBLIC_URL));

        expect(middleware).toHaveBeenCalledTimes(1);
        expect(middleware.mock.calls[0][0]).toBeInstanceOf(NextRequest);
        expect(response.headers.get("x-from")).toBe("middleware");
    });

    it("aceita um middleware assíncrono que devolve promessa", async () => {
        const middleware = vi.fn((_request: NextRequest) =>
            Promise.resolve(
                new NextResponse(null, { headers: { "x-from": "async" } })
            )
        );

        const response = await authMiddleware(middleware)(request(PUBLIC_URL));

        expect(response.headers.get("x-from")).toBe("async");
    });
});

describe("authMiddleware — rotas protegidas", () => {
    it("injeta o id e o e-mail do usuário autenticado nos headers da request", async () => {
        const response = await authMiddleware()(
            requestWithCookie(PROTECTED_URL, "token-do-cookie")
        );

        expect(getCurrentUserMock).toHaveBeenCalledWith("token-do-cookie");
        expect(response.headers.get("x-middleware-request-x-user-id")).toBe(
            "uid-1"
        );
        expect(response.headers.get("x-middleware-request-x-user-email")).toBe(
            "qa-middleware@example.com"
        );
    });

    it("grava e-mail vazio quando o usuário não tem e-mail", async () => {
        getCurrentUserMock.mockResolvedValue({ uid: "uid-2", email: null });

        const response = await authMiddleware()(
            requestWithCookie(PROTECTED_URL, "token")
        );

        expect(response.headers.get("x-middleware-request-x-user-email")).toBe(
            ""
        );
    });

    it("lê o token do header Authorization quando não há cookie", async () => {
        await authMiddleware()(
            request(PROTECTED_URL, {
                authorization: "Bearer token-do-header",
            })
        );

        expect(getCurrentUserMock).toHaveBeenCalledWith("token-do-header");
    });

    it("prefere o cookie ao header Authorization", async () => {
        await authMiddleware()(
            request(PROTECTED_URL, {
                cookie: "access-token=token-do-cookie",
                authorization: "Bearer token-do-header",
            })
        );

        expect(getCurrentUserMock).toHaveBeenCalledWith("token-do-cookie");
    });

    it("passa null quando não há token em lugar nenhum", async () => {
        getCurrentUserMock.mockResolvedValue(null);

        await authMiddleware()(request(PROTECTED_URL));

        expect(getCurrentUserMock).toHaveBeenCalledWith(null);
    });

    it("redireciona para o sign-in preservando a rota de origem quando não há usuário", async () => {
        getCurrentUserMock.mockResolvedValue(null);

        const response = await authMiddleware()(request(PROTECTED_URL));
        const location = new URL(response.headers.get("location") as string);

        expect(response.status).toBe(STATUS_TEMPORARY_REDIRECT);
        expect(location.pathname).toBe("/sign-in");
        expect(location.searchParams.get("redirect")).toBe(
            "/(authenticated)/dashboard"
        );
    });

    it("delega para o middleware seguinte em vez de injetar os headers do usuário", async () => {
        const middleware = vi.fn(
            (_request: NextRequest) =>
                new NextResponse(null, { headers: { "x-from": "middleware" } })
        );

        const response = await authMiddleware(middleware)(
            requestWithCookie(PROTECTED_URL, "token")
        );

        expect(middleware).toHaveBeenCalledTimes(1);
        expect(response.headers.get("x-from")).toBe("middleware");
        expect(
            response.headers.get("x-middleware-request-x-user-id")
        ).toBeNull();
    });

    it("resolve a factory também no caminho autenticado", async () => {
        const produced = vi.fn(
            (_request: NextRequest) =>
                new NextResponse(null, { headers: { "x-from": "factory" } })
        );
        const factory = vi.fn(() => produced);

        const response = await authMiddleware(factory)(
            requestWithCookie(PROTECTED_URL, "token")
        );

        expect(factory).toHaveBeenCalledTimes(1);
        expect(response.headers.get("x-from")).toBe("factory");
    });
});

describe("authMiddleware — falhas na verificação do token", () => {
    it("segue o fluxo sem autenticação quando as credenciais do Firebase Admin faltam", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {
            return;
        });
        getCurrentUserMock.mockRejectedValue(
            new Error("Firebase Admin credentials are not configured")
        );

        const response = await authMiddleware()(
            requestWithCookie(PROTECTED_URL, "token")
        );

        expect(response.status).toBe(STATUS_OK);
        expect(response.headers.get("x-middleware-next")).toBe("1");
        expect(response.headers.get("location")).toBeNull();
        expect(warn).toHaveBeenCalled();

        warn.mockRestore();
    });

    it("usa o middleware seguinte quando as credenciais do Firebase Admin faltam", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {
            return;
        });
        const middleware = vi.fn(
            (_request: NextRequest) =>
                new NextResponse(null, { headers: { "x-from": "middleware" } })
        );
        getCurrentUserMock.mockRejectedValue(
            new Error("Firebase Admin credentials are not configured")
        );

        const response = await authMiddleware(middleware)(
            requestWithCookie(PROTECTED_URL, "token")
        );

        expect(response.headers.get("x-from")).toBe("middleware");

        warn.mockRestore();
    });

    it("redireciona para o sign-in quando a verificação falha por outro motivo", async () => {
        getCurrentUserMock.mockRejectedValue(new Error("token expired"));

        const response = await authMiddleware()(
            requestWithCookie(PROTECTED_URL, "token")
        );

        expect(response.status).toBe(STATUS_TEMPORARY_REDIRECT);
        expect(response.headers.get("location")).toContain("/sign-in");
    });

    it("redireciona para o sign-in quando o erro não é uma instância de Error", async () => {
        getCurrentUserMock.mockRejectedValue("Firebase Admin credentials");

        const response = await authMiddleware()(
            requestWithCookie(PROTECTED_URL, "token")
        );

        expect(response.status).toBe(STATUS_TEMPORARY_REDIRECT);
    });
});

describe("authMiddleware — opções", () => {
    it("respeita a lista de rotas protegidas informada", async () => {
        const middleware = authMiddleware(undefined, {
            protectedRoutes: ["/painel"],
        });

        await middleware(request("http://localhost:3000/painel/entities"));
        expect(getCurrentUserMock).toHaveBeenCalledTimes(1);

        await middleware(request(PROTECTED_URL));
        expect(getCurrentUserMock).toHaveBeenCalledTimes(1);
    });

    it("protege /api/collaboration por padrão", async () => {
        getCurrentUserMock.mockResolvedValue(null);

        const response = await authMiddleware()(
            request("http://localhost:3000/api/collaboration/room")
        );

        expect(response.status).toBe(STATUS_TEMPORARY_REDIRECT);
    });

    it("respeita o destino de redirecionamento informado", async () => {
        getCurrentUserMock.mockResolvedValue(null);

        const response = await authMiddleware(undefined, {
            redirectTo: "/pt-br/entrar",
        })(request(PROTECTED_URL));

        expect(
            new URL(response.headers.get("location") as string).pathname
        ).toBe("/pt-br/entrar");
    });
});
