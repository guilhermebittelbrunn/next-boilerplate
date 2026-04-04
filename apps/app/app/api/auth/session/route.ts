import { getCurrentUser } from "@repo/auth/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE_NAME = "access-token";

/**
 * Sets an httpOnly session cookie from a Firebase ID token (verified server-side).
 * Used by the auth client after sign-in and on token refresh.
 */
export async function POST(request: Request) {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const idToken =
        typeof body === "object" &&
        body !== null &&
        "idToken" in body &&
        typeof (body as { idToken: unknown }).idToken === "string"
            ? (body as { idToken: string }).idToken
            : null;

    if (!idToken) {
        return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    const user = await getCurrentUser(idToken);
    if (!user) {
        return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, idToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60,
    });

    return NextResponse.json({ ok: true });
}

/** Clears the session cookie (sign-out). */
export async function DELETE() {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
    return NextResponse.json({ ok: true });
}
