/** biome-ignore-all lint/complexity/noForEach: <explanation> */

export const GET = () =>
    new Response(JSON.stringify({ message: "OK" }), { status: 200 });
