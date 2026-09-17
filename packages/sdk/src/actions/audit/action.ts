import type { Client } from "../../client/index";
import type { Response } from "../../client/type";
import type {
    AuditEventDTO,
    AuditEventListQuery,
    PageDTO,
    PageQuery,
} from "../../types";

export default class AuditActions {
    // biome-ignore lint/style/noParameterProperties: SDK client pattern
    constructor(private readonly client: Client) {
        this.client = client;
    }

    async list(
        query?: PageQuery & AuditEventListQuery
    ): Promise<PageDTO<AuditEventDTO>> {
        const { data } = await this.client.request<
            Response<PageDTO<AuditEventDTO>>
        >({
            url: "/audit-events",
            method: "GET",
            params: {
                ...(query?.limit ? { limit: query.limit } : {}),
                ...(query?.cursor ? { cursor: query.cursor } : {}),
                ...(query?.userId ? { userId: query.userId } : {}),
                ...(query?.from ? { from: query.from } : {}),
                ...(query?.to ? { to: query.to } : {}),
            },
        });

        return data.data;
    }
}
