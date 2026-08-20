/** biome-ignore-all lint/style/noParameterProperties: <explanation> */

import type { Client } from "../../../client";
import type { Response } from "../../../client/type";
import type {
    AdminCreateUserRequest,
    AdminUpdateUserRequest,
    UserType,
    UserWithAuthDTO,
} from "../../../types";

export default class UserActions {
    constructor(private readonly client: Client) {
        this.client = client;
    }

    /**
     * `type` narrows the listing. The API also scopes it by request context: an admin
     * operating the common panel only ever receives common users.
     */
    async list(params?: { type?: UserType }): Promise<UserWithAuthDTO[]> {
        const { data } = await this.client.request<Response<UserWithAuthDTO[]>>(
            {
                url: "/users",
                method: "GET",
                params: params?.type ? { type: params.type } : undefined,
            }
        );

        return data.data;
    }

    async findById(id: string): Promise<UserWithAuthDTO> {
        const { data } = await this.client.request<Response<UserWithAuthDTO>>({
            url: `/users/${id}`,
            method: "GET",
        });

        return data.data;
    }

    async create(body: AdminCreateUserRequest): Promise<UserWithAuthDTO> {
        const { data } = await this.client.request<Response<UserWithAuthDTO>>({
            url: "/users",
            method: "POST",
            data: body,
        });

        return data.data;
    }

    async update(body: AdminUpdateUserRequest): Promise<UserWithAuthDTO> {
        const { id, ...payload } = body;
        const { data } = await this.client.request<Response<UserWithAuthDTO>>({
            url: `/users/${id}`,
            method: "PUT",
            data: payload,
        });

        return data.data;
    }

    async delete(id: string): Promise<void> {
        await this.client.request<void>({
            url: `/users/${id}`,
            method: "DELETE",
        });
    }
}
