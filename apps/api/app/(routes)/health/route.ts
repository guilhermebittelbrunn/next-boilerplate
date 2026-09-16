// Without this the route is pre-rendered at build time and the answer is frozen:
// a liveness check must be evaluated by the running process, every time it is asked.
export const dynamic = "force-dynamic";

export const GET = () =>
    new Response(JSON.stringify({ message: "OK" }), { status: 200 });
