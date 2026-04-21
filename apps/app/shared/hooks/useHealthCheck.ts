"use client";

import useAlert from "@repo/design-system/hooks/useAlert";
import type { HealthResponse } from "@repo/sdk/src/actions/application/types";
import { handleClientError } from "@repo/shared/utils";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { apiClient } from "@/shared/lib/client";

function getApplicationHealthCheck(): Promise<HealthResponse> {
    return apiClient.application.health.check();
}

export const HEALTH_QUERY_KEY = "health";

/**
 * Exemplo de custom hook que chama a API do próprio app (ex.: health check).
 * Usa React Query para cache, refetch e estados de loading/error.
 */
export function useHealthCheck() {
    const { successAlert, errorAlert } = useAlert();

    const {
        isSuccess,
        isError,
        error,
        data,
        isPending: isLoading,
        ...rest
    } = useQuery({
        queryKey: [HEALTH_QUERY_KEY],
        queryFn: getApplicationHealthCheck,
    });

    useEffect(() => {
        if (isSuccess && data) {
            successAlert(data?.message);
        }
    }, [isSuccess, data, successAlert]);

    useEffect(() => {
        if (isError && error) {
            errorAlert(handleClientError(error));
        }
    }, [isError, error, errorAlert]);

    return { ...rest, data, isLoading, error };
}
