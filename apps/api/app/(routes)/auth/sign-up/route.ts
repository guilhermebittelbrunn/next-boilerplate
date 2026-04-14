import { getAuthInstance } from "@repo/auth/server";
import { UserType } from "@repo/sdk/src/types";
import {
    IdentityToolkitError,
    identitySignUp,
} from "@/(shared)/lib/firebase-identity-toolkit";
import { getMergedUserByUid } from "@/(shared)/lib/user-merge";
import { userRepository } from "@/(shared)/repositories/user.repository";

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
        await userRepository.create({
            reference_id: localId,
            type: UserType.COMMON,
        });
    } catch (profileErr) {
        await getAuthInstance().deleteUser(localId);
        console.error(profileErr);
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
