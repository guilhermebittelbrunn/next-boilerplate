import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const routeNotFound = () =>
    NextResponse.json(
        { error: { code: "ROUTE_NOT_FOUND" } },
        { status: HTTP_STATUS.NOT_FOUND }
    );

export const GET = routeNotFound;
export const POST = routeNotFound;
export const PUT = routeNotFound;
export const PATCH = routeNotFound;
export const DELETE = routeNotFound;
