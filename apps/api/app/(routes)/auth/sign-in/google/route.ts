import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import {
    IdentityToolkitError,
    identitySignInWithGoogleIdToken,
} from "@/(shared)/lib/firebase-identity-toolkit";
import { getMergedUserByUid } from "@/(shared)/lib/user-merge";

const DEFAULT_REQUEST_URI = "http://localhost:3000";

export async function POST(req: Request) {
    const { idToken, requestUri } = await req.json();

    const uri = requestUri ?? DEFAULT_REQUEST_URI;

    try {
        const session = await identitySignInWithGoogleIdToken(idToken, uri);
        const user = await getMergedUserByUid(session.localId);

        if (!user) {
            return Response.json(
                { error: { code: "USERS_NOT_FOUND" } },
                { status: HTTP_STATUS.NOT_FOUND }
            );
        }

        return Response.json({
            session: {
                idToken: session.idToken,
                refreshToken: session.refreshToken,
                expiresIn: session.expiresIn,
            },
            user,
        });
    } catch (e) {
        if (e instanceof IdentityToolkitError) {
            return Response.json({ error: e.message }, { status: 401 });
        }
        throw e;
    }
}
