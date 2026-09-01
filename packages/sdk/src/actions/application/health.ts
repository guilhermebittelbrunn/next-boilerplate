/** biome-ignore-all lint/style/noParameterProperties: todas as actions do SDK recebem o Client por parameter property; manter o formato uniforme entre elas. */
import type { Client } from "../../client";
import type { HealthResponse } from "./types";

export default class HealthActions {
    constructor(private readonly client: Client) {
        this.client = client;
    }

    async check(): Promise<HealthResponse> {
        const { data } = await this.client.request<HealthResponse>({
            url: "/health",
            method: "GET",
        });

        return data;
    }
}
