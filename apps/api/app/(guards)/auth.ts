import type { UserRecord } from "firebase-admin/auth";
import type { NextRequest } from "next/server";
import { resolveApiActor } from "@/(shared)/lib/resolve-api-actor";

type Handler = (
    req: NextRequest,
    ctx: { user: UserRecord }
) => Promise<Response>;

export function authGuard(handler: Handler) {
    return async (req: NextRequest) => {
        const userRecord = await resolveApiActor(req);

        if (!userRecord) {
            return new Response(JSON.stringify({ message: "Invalid token" }), {
                status: 401,
            });
        }

        return handler(req, { user: userRecord });
    };
}
