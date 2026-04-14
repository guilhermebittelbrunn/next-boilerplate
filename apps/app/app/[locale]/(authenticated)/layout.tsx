import type { ReactNode } from "react";
import { requireSession } from "@/lib/server/auth-session";

type Props = {
    readonly children: ReactNode;
    readonly params: Promise<{ locale: string }>;
};

export default async function AuthenticatedGroupLayout({
    children,
    params,
}: Props) {
    const { locale } = await params;
    await requireSession(locale);
    return children;
}
