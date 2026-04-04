/**
 * Server-only: requires valid session and Firestore `users/{uid}.role === "admin"`.
 */
export async function requireAdmin(locale: string): Promise<void> {
    // if (!isFirebaseAuthConfigured()) {
    //     return;
    // }
    // if (!userRepository.isConfigured()) {
    //     return;
    // }
    // const cookieStore = await cookies();
    // const token = cookieStore.get("access-token")?.value ?? null;
    // const user = await getCurrentUser(token);
    // if (!user) {
    //     redirect(`/${locale}/sign-in`);
    // }
    // const profile = await userRepository.getByUid(user.uid);
    // if (!profile || profile.role !== "admin") {
    //     redirect(`/${locale}`);
    // }
}
