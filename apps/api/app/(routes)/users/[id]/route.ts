import type { NextRequest } from "next/server";
import { getMergedUserByUid } from "@/(shared)/lib/user-merge";
import { userRepository } from "@/(shared)/repositories/user.repository";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
    const { id } = await ctx.params;

    const merged = await getMergedUserByUid(id);
    if (merged) {
        return Response.json({ data: merged });
    }

    const user = await userRepository.findById(id);
    if (!user) {
        return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({ data: user });
}

export async function PUT(req: NextRequest, ctx: Ctx) {
    const { id } = await ctx.params;
    const body = await req.json();
    const updatedId = await userRepository.update({ ...body, id });

    return Response.json({ data: updatedId });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
    const { id } = await ctx.params;
    await userRepository.delete(id);

    return new Response(null, { status: 204 });
}
