/** biome-ignore-all lint/suspicious/noExplicitAny: <explanation> */

import { HTTP_STATUS } from "@repo/shared/utils";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import axios, {
    type AxiosInstance,
    type AxiosRequestConfig,
    type AxiosResponse,
} from "axios";
import ClientAuth from "./auth";

export type Project = "app" | "web" | "api";
export type Context = "common" | "admin";

export type Config = {
    project: Project;
    url: string;
    context: Context;
};

export default class BaseClient {
    config: Config;

    restClient: AxiosInstance;

    auth: ClientAuth;

    constructor(config: Config) {
        this.config = config;
        this.auth = new ClientAuth();
        this.restClient = axios.create({ baseURL: this.config.url });
    }

    async request<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        try {
            return await this.restClient.request<T>(config);
        } catch (error) {
            throw new FormattedError(error);
        }
    }

    setInterceptorError(callback: (error: FormattedError) => void) {
        this.restClient.interceptors.response.use(
            (response: AxiosResponse) => response,
            (error: any) => {
                if (error.response?.status === HTTP_STATUS.UNAUTHORIZED) {
                    callback(new FormattedError(error));
                }
                return Promise.reject(error);
            }
        );
    }

    get requestRole(): string {
        const requestRoleHeader =
            this.restClient.defaults.headers.common["x-role"];

        return requestRoleHeader as string;
    }

    setHeader(key: string, value: string): void {
        this.restClient.defaults.headers.common[key] = value;
    }

    setHeaders(headers: Record<string, string>): void {
        for (const header in headers) {
            if (Object.hasOwn(headers, header)) {
                this.setHeader(header, headers[header]);
            }
        }
    }

    removeHeader(key: string): void {
        this.restClient.defaults.headers.common[key] = undefined;
    }
}
