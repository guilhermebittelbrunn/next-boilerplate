/** biome-ignore-all lint/complexity/noForEach: <explanation> */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const corsHeaders = {
    "Access-Control-Allow-Origin": process.env.CORS_ORIGIN ?? "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
};

export function middleware(request: NextRequest) {
    // Respond to preflight
    if (request.method === "OPTIONS") {
        return new NextResponse(null, { status: 204, headers: corsHeaders });
    }

    const response = NextResponse.next();
    Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
    });
    return response;
}

export const config = {
    matcher: "/:path*",
};
