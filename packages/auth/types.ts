/** biome-ignore-all lint/style/noEnum: <explanation> */
import type { User } from "firebase/auth";

export enum UserRoleLevel {
    ADMIN = "admin",
    COMMON = "common",
}

export interface UserDTO extends User {}

export type SignInDTO = {
    email: string;
    password: string;
};

export type SignUpDTO = {
    email: string;
    password: string;
};
