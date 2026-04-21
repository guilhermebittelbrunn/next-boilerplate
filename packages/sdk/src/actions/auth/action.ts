import type BaseClient from "../../client/base";
import type { Response } from "../../client/type";

export type AuthMePayload = Record<string, unknown> & {
    uid: string;
    type?: string;
};

export default class AuthActions {
    private readonly client: BaseClient;

    constructor(client: BaseClient) {
        this.client = client;
    }

    async me(): Promise<AuthMePayload> {
        const { data } = await this.client.request<Response<AuthMePayload>>({
            url: "/auth/me",
            method: "GET",
        });

        return data.data as AuthMePayload;
    }
}
