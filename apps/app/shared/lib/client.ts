import { Client } from "@repo/sdk/src/client/index";

export const apiClient = new Client({
    url: process.env.NEXT_PUBLIC_API_URL as string,
    project: "app",
    context: "common",
});
