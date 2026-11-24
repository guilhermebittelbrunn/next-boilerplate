import type { ReactNode } from "react";
import { panelPageMetadata } from "@/lib/server/panelMetadata";

export const generateMetadata = panelPageMetadata("/playground");

export default function PlaygroundLayout({
    children,
}: {
    readonly children: ReactNode;
}) {
    return children;
}
