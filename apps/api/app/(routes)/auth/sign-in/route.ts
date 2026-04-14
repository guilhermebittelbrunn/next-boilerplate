import { identitySignInWithPassword } from "@/(shared)/lib/firebase-identity-toolkit";
import { getMergedUserByUid } from "@/(shared)/lib/user-merge";

export async function POST(req: Request) {
    const { email, password } = await req.json();

    const session = await identitySignInWithPassword(email, password);

    const user = await getMergedUserByUid(session.localId);

    if (!user) {
        return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({
        session: {
            idToken: session.idToken,
            refreshToken: session.refreshToken,
            expiresIn: session.expiresIn,
        },
        user,
    });
}
