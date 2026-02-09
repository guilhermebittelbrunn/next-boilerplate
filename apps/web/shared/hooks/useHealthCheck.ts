"use client";

import { useQuery } from "@tanstack/react-query";

type HealthResponse = {
    status: string;
    timestamp: string;
};

async function fetchHealth(): Promise<HealthResponse> {
    const res = await fetch("/api/health", {
        method: "GET",
        headers: { Accept: "application/json" },
    });

    if (!res.ok) {
        const error: { status: number; statusText: string; data?: unknown } = {
            status: res.status,
            statusText: res.statusText,
        };
        try {
            error.data = await res.json();
        } catch {
            error.data = await res.text();
        }
        throw error;
    }

    return res.json() as Promise<HealthResponse>;
}

/**
 * Exemplo de custom hook que chama a API do próprio app (ex.: health check).
 * Usa React Query para cache, refetch e estados de loading/error.
 */
export function useHealthCheck() {
    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: ["health"],
        queryFn: fetchHealth,
        retry: 1,
    });

    return { data, isLoading, isError, error, refetch };
}
