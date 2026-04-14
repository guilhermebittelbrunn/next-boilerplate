/** biome-ignore-all lint/style/noParameterProperties: <explanation> */
import type { UserDTO, UserWithAuthDTO } from "src/types";
import type { Client } from "../../../client";
import type { Response } from "../../../client/type";

export default class UserActions {
    constructor(private readonly client: Client) {
        this.client = client;
    }

    async list(): Promise<UserWithAuthDTO[]> {
        const { data } = await this.client.request<Response<UserWithAuthDTO[]>>(
            {
                url: "/users",
                method: "GET",
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

    async create(user: UserDTO): Promise<UserDTO> {
        const { data } = await this.client.request<Response<UserDTO>>({
            url: "/users",
            method: "POST",
            data: user,
        });

        return data.data;
    }

    async update(user: UserDTO): Promise<string> {
        const { data } = await this.client.request<Response<string>>({
            url: `/users/${user.id}`,
            method: "PUT",
            data: user,
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
