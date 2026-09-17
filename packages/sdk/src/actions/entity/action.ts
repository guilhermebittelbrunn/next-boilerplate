import type { Client } from "../../client/index";
import type { Response } from "../../client/type";
import type {
    CreateEntityRequest,
    EntityDTO,
    EntitySummaryDTO,
    PageDTO,
    PageQuery,
    UpdateEntityRequest,
} from "../../types";

export default class EntityActions {
    // biome-ignore lint/style/noParameterProperties: SDK client pattern
    constructor(private readonly client: Client) {
        this.client = client;
    }

    async list(query?: PageQuery): Promise<PageDTO<EntityDTO>> {
        const { data } = await this.client.request<
            Response<PageDTO<EntityDTO>>
        >({
            url: "/entities",
            method: "GET",
            params: {
                ...(query?.limit ? { limit: query.limit } : {}),
                ...(query?.cursor ? { cursor: query.cursor } : {}),
            },
        });

        return data.data;
    }

    async summary(): Promise<EntitySummaryDTO> {
        const { data } = await this.client.request<Response<EntitySummaryDTO>>({
            url: "/entities/summary",
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
