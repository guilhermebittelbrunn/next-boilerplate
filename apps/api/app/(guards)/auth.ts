import { getCurrentUser } from "@repo/auth/server";
import type { UserRecord } from "firebase-admin/auth";
import type { NextRequest } from "next/server";

type Handler = (
    req: NextRequest,
    ctx: { user: UserRecord }
) => Promise<Response>;

export function authGuard(handler: Handler) {
    return async (req: NextRequest) => {
        const authHeader = req.headers.get("authorization");

        if (!authHeader?.startsWith("Bearer ")) {
            return new Response(
                JSON.stringify({ message: "Missing bearer token" }),
                {
                    status: 401,
                }
            );
        }

        const token = authHeader.slice("Bearer ".length).trim();
        const userRecord = await getCurrentUser(token);

        if (!userRecord) {
            return new Response(JSON.stringify({ message: "Invalid token" }), {
                status: 401,
            });
        }

        return handler(req, { user: userRecord });
    };
}
