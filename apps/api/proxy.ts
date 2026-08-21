/** biome-ignore-all lint/complexity/noForEach: proxy merges headers */
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const allowHeaders = [
    "Content-Type",
    "Authorization",
    "x-role",
    "x-locale",
    ...Object.values(AUTH_REQUEST_HEADER),
].join(", ");

const corsHeaders = {
    "Access-Control-Allow-Origin": process.env.CORS_ORIGIN ?? "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": allowHeaders,
    "Access-Control-Max-Age": "86400",
};

export function proxy(request: NextRequest) {
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
