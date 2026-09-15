import { revokeUserSessions } from "@repo/auth/server";
import { requireCommonPanelApi } from "@/app/(guards)/common-panel";

export const POST = requireCommonPanelApi(async (_req, ctx) => {
    await revokeUserSessions(ctx.user.uid);

    return Response.json({ data: { confirmed: true } });
});
