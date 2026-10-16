import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { resolveApiActor } from "@/(shared)/lib/resolve-api-actor";
import { getMergedUserByUid } from "@/(shared)/lib/user-merge";

const invalidToken = () =>
    Response.json(
        { error: { code: "AUTH_INVALID_TOKEN" } },
        { status: HTTP_STATUS.UNAUTHORIZED }
    );

export async function GET(req: NextRequest) {
    const actor = await resolveApiActor(req);

    if (!actor) {
        return invalidToken();
    }

    const user = await getMergedUserByUid(actor.uid);

    if (!user) {
        return invalidToken();
    }

    return Response.json({ data: user });
}
