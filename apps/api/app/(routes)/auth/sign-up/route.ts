import { getAuthInstance } from "@repo/auth/server";
import { logEvent } from "@repo/shared/utils/helpers/log";
import { requestIdFrom } from "@repo/shared/utils/helpers/request-id";
import {
    IdentityToolkitError,
    identitySignUp,
} from "@/(shared)/lib/firebase-identity-toolkit";
import {
    createDefaultUserProfile,
    getMergedUserByUid,
} from "@/(shared)/lib/user-merge";

export async function POST(req: Request) {
    const { email, password } = await req.json();

    let localId: string;
    let idToken: string;
    let refreshToken: string;
    let expiresIn: string;

    try {
        const session = await identitySignUp(email, password);
        localId = session.localId;
        idToken = session.idToken;
        refreshToken = session.refreshToken;
        expiresIn = session.expiresIn;
    } catch (e) {
        if (e instanceof IdentityToolkitError) {
            return Response.json({ error: e.message }, { status: 400 });
        }
        throw e;
    }

    try {
        await createDefaultUserProfile(localId);
    } catch {
        await getAuthInstance().deleteUser(localId);
        logEvent("auth", "profile-create-failed", {
            requestId: requestIdFrom(req),
        });
        return Response.json(
            { error: "Could not create user profile" },
            { status: 500 }
        );
    }

    const user = await getMergedUserByUid(localId);

    return Response.json(
        {
            session: { idToken, refreshToken, expiresIn },
            user,
        },
        { status: 201 }
    );
}
