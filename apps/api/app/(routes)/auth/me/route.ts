import type { NextRequest } from "next/server";
import { resolveApiActor } from "@/(shared)/lib/resolve-api-actor";
import { getMergedUserByUid } from "@/(shared)/lib/user-merge";

export async function GET(req: NextRequest) {
    const actor = await resolveApiActor(req);

    if (!actor) {
        return Response.json(
            { message: "Invalid or expired token" },
            { status: 401 }
        );
    }

    const user = await getMergedUserByUid(actor.uid);

    if (!user) {
        return Response.json(
            { message: "Invalid or expired token" },
            { status: 401 }
        );
    }

    return Response.json({ data: user });
}
