import { getCurrentUser } from "@repo/auth/server";
import type { UserDTO } from "@repo/auth/types";
import type { NextRequest } from "next/server";

type Handler = (
    req: NextRequest,
    ctx: { user: UserDTO | null }
) => Promise<Response>;

export function authGuard(handler: Handler) {
    return async (req: NextRequest) => {
        const authHeader = req.headers.get("authorization");

        if (!authHeader) {
            return new Response(JSON.stringify({ message: "Missing token" }), {
                status: 401,
            });
        }

        const token = authHeader.replace("Bearer ", "");

        try {
            const decoded = (await getCurrentUser(token)) as UserDTO | null;

            const context = {
                user: decoded,
            };

            return handler(req, context);
        } catch {
            return new Response(JSON.stringify({ message: "Invalid token" }), {
                status: 401,
            });
        }
    };
}
