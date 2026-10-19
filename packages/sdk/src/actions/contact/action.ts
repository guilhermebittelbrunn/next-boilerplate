import type { Client } from "../../client/index";
import type { Response } from "../../client/type";
import type { ContactMessageRequest, ContactMessageSent } from "../../types";

export default class ContactActions {
    // biome-ignore lint/style/noParameterProperties: SDK client pattern
    constructor(private readonly client: Client) {
        this.client = client;
    }

    /** Public: answers without a session. */
    async send(body: ContactMessageRequest): Promise<ContactMessageSent> {
        const { data } = await this.client.request<
            Response<ContactMessageSent>
        >({
            url: "/contact",
            method: "POST",
            data: body,
        });

        return data.data;
    }
}
