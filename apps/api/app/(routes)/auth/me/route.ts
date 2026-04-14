import type { NextRequest } from "next/server";
import { getMergedUserFromIdToken } from "@/(shared)/lib/user-merge";

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
        return Response.json(
            { message: "Missing bearer token" },
            { status: 401 }
        );
    }

    const token = authHeader.slice("Bearer ".length).trim();
    const user = await getMergedUserFromIdToken(token);

    if (!user) {
        return Response.json(
            { message: "Invalid or expired token" },
            { status: 401 }
        );
    }

    return Response.json({ data: user });
}
