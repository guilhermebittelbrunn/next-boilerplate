import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "./server";

/**
 * Firebase Auth middleware for Next.js
 * Verifies the Firebase ID token from cookies or Authorization header
 */
export const authMiddleware = async (
  request: NextRequest,
  options?: {
    protectedRoutes?: string[];
    redirectTo?: string;
  }
) => {
  const { protectedRoutes = [], redirectTo = "/sign-in" } = options || {};

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Get token from cookie or Authorization header
  const token =
    request.cookies.get("firebase-token")?.value ||
    request.headers.get("authorization")?.replace("Bearer ", "");

  try {
    const user = await getCurrentUser(token || null);

    if (!user) {
      const url = new URL(redirectTo, request.url);
      url.searchParams.set("redirect", request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }

    // Add user info to request headers for use in server components
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", user.uid);
    requestHeaders.set("x-user-email", user.email || "");

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    // If Firebase is not configured, allow the request to pass through
    // This allows development without Firebase setup
    if (error instanceof Error && error.message.includes("Firebase Admin credentials")) {
      console.warn("Firebase Auth not configured, skipping authentication");
      return NextResponse.next();
    }
    // For other errors, redirect to sign-in
    const url = new URL(redirectTo, request.url);
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

};

