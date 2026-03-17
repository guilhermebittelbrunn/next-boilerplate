/** biome-ignore-all lint/suspicious/useAwait: <explanation> */
import { authGuard } from "@/app/(guards)/auth";

export const GET = authGuard(async (_req, ctx) => {
    const user = ctx.user;

    console.log("user :>> ", user);

    /** example of error response */
    // return new Response(JSON.stringify({ message: "error message" }), {
    //     status: 400,
    // });

    return new Response(
        JSON.stringify({
            message:
                user?.displayName ?? user?.email ?? user?.providerData[0].email,
        }),
        { status: 200 }
    );
});
