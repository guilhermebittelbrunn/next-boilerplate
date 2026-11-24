import type { ReactNode } from "react";
import { panelPageMetadata } from "@/lib/server/panelMetadata";

export const generateMetadata = panelPageMetadata("/entities/create");

export default function CreateEntityLayout({
    children,
}: {
    readonly children: ReactNode;
}) {
    return children;
}
