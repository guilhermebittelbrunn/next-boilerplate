/** biome-ignore-all lint/suspicious/noExplicitAny: <explanation> */
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext, useState } from "react";

type QueryProviderProps = {
    children: ReactNode;
};

type QueryContextType = {
    removeDataFromCache: (id: string, key: string) => void;
    updateDataInCache: (data: any, key: string) => void;
};

const QueryContext = createContext<QueryContextType>({} as QueryContextType);

export function QueryProvider({ children }: QueryProviderProps) {
    const [client] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        refetchOnWindowFocus: false,
                    },
                },
            })
    );

    const updateDataInCache = (data: any, key: string) => {
        client.setQueryData([key], (old: any[]) =>
            old.map((oldUser) => (oldUser.id === data.id ? data : oldUser))
        );
    };

    const removeDataFromCache = (id: string, key: string) => {
        client.setQueryData([key], (old: any[]) =>
            old.filter((it) => it.id !== id)
        );
    };

    return (
        <QueryClientProvider client={client}>
            <QueryContext.Provider
                value={{ removeDataFromCache, updateDataInCache }}
            >
                {children}
            </QueryContext.Provider>
        </QueryClientProvider>
    );
}

export function useQuery() {
    const context = useContext(QueryContext);

    if (!context) {
        throw new Error("useQuery must be used within a QueryProvider");
    }

    return context;
}
