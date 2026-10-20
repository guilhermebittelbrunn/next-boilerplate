import type { Client } from "../../client/index";
import type { Response } from "../../client/type";
import type {
    MarkAllNotificationsReadResponse,
    MarkNotificationReadResponse,
    NotificationDTO,
    NotificationUnreadCountDTO,
    PageDTO,
    PageQuery,
} from "../../types";

export default class NotificationActions {
    // biome-ignore lint/style/noParameterProperties: SDK client pattern
    constructor(private readonly client: Client) {
        this.client = client;
    }

    async list(query?: PageQuery): Promise<PageDTO<NotificationDTO>> {
        const { data } = await this.client.request<
            Response<PageDTO<NotificationDTO>>
        >({
            url: "/notifications",
            method: "GET",
            params: {
                ...(query?.limit ? { limit: query.limit } : {}),
                ...(query?.cursor ? { cursor: query.cursor } : {}),
            },
        });

        return data.data;
    }

    async unreadCount(): Promise<NotificationUnreadCountDTO> {
        const { data } = await this.client.request<
            Response<NotificationUnreadCountDTO>
        >({
            url: "/notifications/unread-count",
            method: "GET",
        });

        return data.data;
    }

    async markRead(id: string): Promise<MarkNotificationReadResponse> {
        const { data } = await this.client.request<
            Response<MarkNotificationReadResponse>
        >({
            url: `/notifications/${encodeURIComponent(id)}/read`,
            method: "POST",
        });

        return data.data;
    }

    async markAllRead(): Promise<MarkAllNotificationsReadResponse> {
        const { data } = await this.client.request<
            Response<MarkAllNotificationsReadResponse>
        >({
            url: "/notifications/read-all",
            method: "POST",
        });

        return data.data;
    }
}
