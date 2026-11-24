import type { ReactNode } from "react";
import { panelPageMetadata } from "@/lib/server/panelMetadata";

export const generateMetadata = panelPageMetadata("/admin/users/edit/[id]");

export default function EditUserLayout({
    children,
}: {
    readonly children: ReactNode;
}) {
    return children;
}
