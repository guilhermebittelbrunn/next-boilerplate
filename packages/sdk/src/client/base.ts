/** biome-ignore-all lint/suspicious/noExplicitAny: Axios interceptor typing */

import type { IAuthContextProps } from "@repo/auth/types";
import { HTTP_STATUS } from "@repo/shared/utils";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import axios, {
    type AxiosInstance,
    type AxiosRequestConfig,
    type AxiosResponse,
} from "axios";
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

    constructor(config: Config) {
        this.config = config;
        this.restClient = axios.create({ baseURL: this.config.url });
    }

    setAuthRequestContext(props: IAuthContextProps): void {
        this.setOptionalHeader(
            AUTH_REQUEST_HEADER.USER_ID,
            props.userId ?? undefined
        );
        this.setOptionalHeader(
            AUTH_REQUEST_HEADER.REQUEST_USER_ID,
            props.requestUserId ?? undefined
        );
        this.setOptionalHeader(
            AUTH_REQUEST_HEADER.USER_ROLE,
            props.userRole ?? undefined
        );
        this.setOptionalHeader(
            AUTH_REQUEST_HEADER.REQUEST_ROLE,
            props.requestRole ?? undefined
        );
        if (props.requestRole) {
            this.setHeader("x-role", props.requestRole);
        }
    }

    clearAuthRequestContext(): void {
        this.removeHeader(AUTH_REQUEST_HEADER.USER_ID);
        this.removeHeader(AUTH_REQUEST_HEADER.REQUEST_USER_ID);
        this.removeHeader(AUTH_REQUEST_HEADER.USER_ROLE);
        this.removeHeader(AUTH_REQUEST_HEADER.REQUEST_ROLE);
        this.removeHeader("x-role");
    }

    private setOptionalHeader(key: string, value: string | undefined): void {
        if (value === undefined || value === "") {
            this.removeHeader(key);
        } else {
            this.setHeader(key, value);
        }
    }

    async request<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        try {
            // console.log("config :>> ", config);

            // console.log(
            //     "this.restClient.defaults.headers.common :>> ",
            //     this.restClient.defaults.headers.common
            // );

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

    setAuthorizationHeader(token: string): void {
        this.setHeader("Authorization", `Bearer ${token}`);
    }

    removeHeader(key: string): void {
        this.restClient.defaults.headers.common[key] = undefined;
    }
}
