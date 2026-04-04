import type { NextRequest } from "next/server";
import { userRepository } from "@/(shared)/repositories/user";

export const GET = async ({ params }: { params: { id: string } }) => {
    const user = await userRepository.findById(params.id);

    if (!user) {
        return new Response(JSON.stringify({ error: "User not found" }), {
            status: 404,
        });
    }

    return new Response(JSON.stringify({ data: user }), { status: 200 });
};

export const PUT = async ({
    request,
    params,
}: {
    request: Request;
    params: { id: string };
}) => {
    const body = await request.json();
    const id = params.id;

    const updatedId = await userRepository.update({ ...body, id });

    return new Response(JSON.stringify({ data: updatedId }), { status: 200 });
};

export const DELETE = async (_: NextRequest, { params }) => {
    const { id } = await params;

    await userRepository.delete(id);

    return new Response(undefined, { status: 204 });
};
