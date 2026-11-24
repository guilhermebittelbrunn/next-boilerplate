import type { ReactNode } from "react";
import { panelPageMetadata } from "@/lib/server/panelMetadata";

export const generateMetadata = panelPageMetadata("/admin/users/create");

export default function CreateUserLayout({
    children,
}: {
    readonly children: ReactNode;
}) {
    return children;
}
