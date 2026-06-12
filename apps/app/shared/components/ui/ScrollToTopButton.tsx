"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import { getDictionary } from "@repo/internationalization/client";
import { ArrowUpIcon } from "lucide-react";
import { useEffect, useState } from "react";

const SCROLL_TO_TOP_THRESHOLD = 300;

export function ScrollToTopButton(props: { className?: string }) {
    const { className } = props;
    const { dictionary } = getDictionary();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const onScroll = () => {
            setVisible(window.scrollY > SCROLL_TO_TOP_THRESHOLD);
        };
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    if (!visible) {
        return null;
    }

    return (
        <Button
            aria-label={dictionary.components.scrollToTop.ariaLabel}
            className={cn(
                "fixed right-4 bottom-4 z-50 h-11 w-11 rounded-full shadow-md",
                className
            )}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            size="icon"
            type="button"
            variant="secondary"
        >
            <ArrowUpIcon className="size-5" />
        </Button>
    );
}
