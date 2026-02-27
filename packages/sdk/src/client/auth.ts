import type { UserDTO } from "../../../auth/types";

export default class ClientAuth {
    user: UserDTO | undefined;

    token: string | undefined;
}
