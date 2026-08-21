"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";

const STALE_TIME_MS = 60_000; // 1 minute — avoids refetching on every mount
const GC_TIME_MS = 300_000; // 5 minutes
const MAX_QUERY_RETRIES = 1;

type QueryProviderProps = {
    children: ReactNode;
};

export function QueryProvider({ children }: QueryProviderProps) {
    const [client] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: STALE_TIME_MS,
                        gcTime: GC_TIME_MS,
                        retry: MAX_QUERY_RETRIES,
                        refetchOnWindowFocus: false,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
}
