export const GET = (): Response =>
    new Response(JSON.stringify({ message: "OK" }), { status: 200 });
