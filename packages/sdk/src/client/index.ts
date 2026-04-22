/** biome-ignore-all lint/complexity/noUselessConstructor: subclasses wire action modules */

import { UserRoleLevel } from "@repo/auth/types";
import ApplicationActions from "../actions/application/application";
import AuthActions from "../actions/auth/action";
import EntityActions from "../actions/entity/action";
import UserActions from "../actions/user/user/action";
import BaseClient, { type Config } from "./base";

export class Client extends BaseClient {
    application!: ApplicationActions;
    authApi!: AuthActions;
    user!: UserActions;
    entity!: EntityActions;

    constructor(config: Config) {
        super(config);
        this.application = new ApplicationActions(this);
        this.authApi = new AuthActions(this);
        this.user = new UserActions(this);
        this.entity = new EntityActions(this);
    }

    get isAdminContext(): boolean {
        return this.config.context === "admin";
    }

    get isCommonContext(): boolean {
        return this.config.context === "common";
    }

    changeToAdminContext(): void {
        this.config.context = "admin";
        this.setHeader("x-role", UserRoleLevel.ADMIN);
    }

    changeToCommonContext(): void {
        this.config.context = "common";
        this.setHeader("x-role", UserRoleLevel.COMMON);
    }

    ensureIsAdminContext(): void {
        if (this.config.context !== "admin") {
            throw new Error(
                "Change SDK context to ADMIN to access this action"
            );
        }
    }

    ensureIsCommonContext(): void {
        if (this.config.context !== "common") {
            throw new Error(
                "Change SDK context to COMMON to access this action"
            );
        }
    }
}
