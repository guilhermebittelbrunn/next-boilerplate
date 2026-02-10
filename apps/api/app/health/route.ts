export const GET = (req: Request): Response => {
    console.log("Health check", req);

    return new Response("OK", { status: 200 });
};
