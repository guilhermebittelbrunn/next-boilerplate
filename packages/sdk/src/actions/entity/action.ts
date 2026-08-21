import type { Client } from "../../client/index";
import type { Response } from "../../client/type";
import type {
    CreateEntityRequest,
    EntityDTO,
    UpdateEntityRequest,
} from "../../types";

export default class EntityActions {
    // biome-ignore lint/style/noParameterProperties: SDK client pattern
    constructor(private readonly client: Client) {
        this.client = client;
    }

    async list(): Promise<EntityDTO[]> {
        const { data } = await this.client.request<Response<EntityDTO[]>>({
            url: "/entities",
            method: "GET",
        });

        return data.data;
    }

    async findById(id: string): Promise<EntityDTO> {
        const { data } = await this.client.request<Response<EntityDTO>>({
            url: `/entities/${id}`,
            method: "GET",
        });

        return data.data;
    }

    async create(body: CreateEntityRequest): Promise<EntityDTO> {
        const { data } = await this.client.request<Response<EntityDTO>>({
            url: "/entities",
            method: "POST",
            data: body,
        });

        return data.data;
    }

    async update(
        id: string,
        body: UpdateEntityRequest
    ): Promise<{ id: string }> {
        const { data } = await this.client.request<Response<{ id: string }>>({
            url: `/entities/${id}`,
            method: "PUT",
            data: body,
        });

        return data.data;
    }

    async delete(id: string): Promise<void> {
        await this.client.request<void>({
            url: `/entities/${id}`,
            method: "DELETE",
        });
    }
}
