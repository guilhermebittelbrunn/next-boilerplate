import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEntityCrud } from "@/app/[locale]/(authenticated)/(common)/(pages)/entities/(hooks)/useEntityCrud";

const { updateMock, errorAlertMock, localeRef } = vi.hoisted(() => ({
    updateMock: vi.fn(),
    errorAlertMock: vi.fn(),
    localeRef: { current: "pt-br" as "pt-br" | "en" | "es" },
}));

vi.mock("@/shared/lib/client", () => ({
    apiClient: {
        entity: { update: (...args: unknown[]) => updateMock(...args) },
    },
}));

vi.mock("@repo/design-system/hooks/useAlert", () => ({
    default: () => ({
        successAlert: vi.fn(),
        errorAlert: (...args: unknown[]) => errorAlertMock(...args),
    }),
}));

vi.mock("@repo/internationalization/client", () => ({
    getDictionary: () => ({
        locale: localeRef.current,
        dictionary: {
            apps: {
                app: {
                    pages: {
                        common: {
                            entities: {
                                messages: {
                                    created: "c",
                                    updated: "u",
                                    deleted: "d",
                                },
                            },
                        },
                    },
                },
            },
        },
    }),
}));

const REQUEST_ID = "3f2a1b8c-0f4a-4d0a-9e77-9f5f0a3a1c22";
const NOT_FOUND = 404;

function apiRejection(headers: Record<string, string> = {}): AxiosError {
    const error = new AxiosError("Request failed");
    error.response = {
        data: { error: { code: "ENTITY_NOT_FOUND" } },
        status: NOT_FOUND,
        statusText: "Not Found",
        headers,
        config: { headers: new AxiosHeaders() },
    };
    return error;
}

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}

async function submitFailingUpdate() {
    const { result } = renderHook(() => useEntityCrud(), { wrapper });

    result.current.updateEntityMutation.mutate({
        id: "1",
        name: "Nome",
        description: "Descrição",
        type: "PERSON",
        photo: "",
        genre: "unset",
        birthdate: "",
        enabled: true,
    } as never);

    await waitFor(() =>
        expect(result.current.updateEntityMutation.isError).toBe(true)
    );

    return errorAlertMock.mock.calls.at(-1)?.[0] as string;
}

beforeEach(() => {
    localeRef.current = "pt-br";
    queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    updateMock.mockReset();
    errorAlertMock.mockReset();
});

describe("erro de mutation no painel", () => {
    it("mostra o identificador da resposta atrás do rótulo traduzido", async () => {
        updateMock.mockRejectedValue(
            apiRejection({ "x-request-id": REQUEST_ID })
        );

        expect(await submitFailingUpdate()).toBe(
            `Entidade não encontrada. (Código do erro: ${REQUEST_ID})`
        );
    });

    it("usa o rótulo do idioma da conta", async () => {
        localeRef.current = "es";
        updateMock.mockRejectedValue(
            apiRejection({ "x-request-id": REQUEST_ID })
        );

        expect(await submitFailingUpdate()).toBe(
            `Entidad no encontrada. (Código del error: ${REQUEST_ID})`
        );
    });

    /**
     * O caminho degradado é o padrão: sem identificador, a mensagem tem de ser a
     * mesma string de antes do header existir, sem parênteses vazios nem rótulo solto.
     */
    it("mantém a mensagem intacta quando a resposta não traz identificador", async () => {
        updateMock.mockRejectedValue(apiRejection());

        const message = await submitFailingUpdate();

        expect(message).toBe("Entidade não encontrada.");
        expect(message).not.toContain("(");
        expect(message).not.toContain("null");
        expect(message).not.toContain("undefined");
    });

    it("mantém a mensagem intacta quando a API não respondeu", async () => {
        updateMock.mockRejectedValue(
            new AxiosError("Network Error", AxiosError.ERR_NETWORK)
        );

        const message = await submitFailingUpdate();

        expect(message).toBe("Um erro inesperado aconteceu");
        expect(message).not.toContain("(");
    });
});
