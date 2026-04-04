import { userRepository } from "@/(shared)/repositories/user";
import { authGuard } from "@/app/(guards)/auth";

export const GET = authGuard(async (req, ctx) => {
    console.log(ctx.user);
    const users = await userRepository.findAll();

    return new Response(JSON.stringify({ data: users }), { status: 200 });
});

export const POST = authGuard(async (req, ctx) => {
    const body = await request.json();
    const user = await userRepository.create(body);

    return new Response(JSON.stringify({ data: user }), { status: 201 });
});
