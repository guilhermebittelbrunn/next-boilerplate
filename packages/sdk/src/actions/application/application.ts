import type { Client } from "../../client";
import HealthActions from "./health";

export default class ApplicationActions {
    health: HealthActions;

    constructor(client: Client) {
        this.health = new HealthActions(client);
    }
}
