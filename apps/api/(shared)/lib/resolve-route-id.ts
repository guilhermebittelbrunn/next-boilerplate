/**
 * Next.js App Router context for dynamic `[id]` segments (sync or async `params`).
 */
export type RouteIdParamsContext = {
    params: { id: string } | Promise<{ id: string }>;
};

export async function resolveIdFromContext(
    ctx: RouteIdParamsContext
): Promise<string> {
    const resolvedParams = await ctx.params;
    return resolvedParams.id;
}
