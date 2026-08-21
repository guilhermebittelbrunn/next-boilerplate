"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Spinner } from "@repo/design-system/components/ui/spinner";
import { cn } from "@repo/design-system/lib/utils";
import { getDictionary } from "@repo/internationalization/client";
import { useRouter } from "next/navigation";
import { LoadErrorState } from "@/shared/components/ui/LoadErrorState";

type ContainerProps = {
    children: React.ReactNode;
    className?: string;
    loading?: boolean;
    loadError?: string | null;
    footer?: React.ReactNode;
    showGoBack?: boolean;
    contentOnly?: boolean;
};

type StickyParts = {
    stickyBar: (inner: React.ReactNode) => React.ReactNode;
    backButton: React.ReactNode;
};

function LoadingPanel() {
    return (
        <div className="flex min-h-screen w-full flex-1 items-center justify-center rounded-xl bg-muted/50 p-4 md:min-h-min">
            <Spinner className="size-10" />
        </div>
    );
}

function contentOnlyLayout(props: {
    body: React.ReactNode;
    showGoBack?: boolean;
} & StickyParts) {
    const { body, showGoBack, stickyBar, backButton } = props;
    return (
        <>
            <div className="flex min-h-[50vh] w-full flex-1 flex-col">{body}</div>
            {showGoBack ? stickyBar(backButton) : null}
        </>
    );
}

function defaultLayout(
    props: {
        body: React.ReactNode;
        footer?: React.ReactNode;
        showGoBack?: boolean;
    } & StickyParts
) {
    const { body, footer, showGoBack, stickyBar, backButton } = props;
    return (
        <>
            <div className="flex min-h-[50vh] w-full flex-1 flex-col overflow-auto rounded-xl bg-muted/50 p-4 md:min-h-min">
                {body}
            </div>
            {(footer || showGoBack) &&
                stickyBar(
                    <>
                        {showGoBack ? backButton : null}
                        {footer}
                    </>
                )}
        </>
    );
}

export const Container = ({
    children,
    className,
    loading,
    loadError,
    footer,
    showGoBack,
    contentOnly = false,
}: ContainerProps) => {
    const router = useRouter();
    const { dictionary } = getDictionary();
    const backLabel = dictionary.components.footer.back;

    const stickyBar = (inner: React.ReactNode) => (
        <div className="sticky bottom-0 z-10 mt-4 flex w-full flex-wrap items-center justify-end gap-3 border-border border-t bg-background/95 py-4 backdrop-blur supports-backdrop-filter:bg-background/80">
            {inner}
        </div>
    );

    const backButton = (
        <Button onClick={() => router.back()} type="button" variant="outline">
            {backLabel}
        </Button>
    );

    const parts: StickyParts = { stickyBar, backButton };

    const renderBody = () => {
        if (loading) {
            return <LoadingPanel />;
        }

        if (loadError) {
            if (contentOnly) {
                return contentOnlyLayout({
                    body: <LoadErrorState message={loadError} />,
                    showGoBack,
                    ...parts,
                });
            }
            return defaultLayout({
                body: <LoadErrorState message={loadError} />,
                footer,
                showGoBack,
                ...parts,
            });
        }

        if (contentOnly) {
            return contentOnlyLayout({
                body: children,
                showGoBack,
                ...parts,
            });
        }

        return defaultLayout({
            body: children,
            footer,
            showGoBack,
            ...parts,
        });
    };

    return (
        <div
            className={cn(
                "flex max-w-full flex-1 flex-col gap-0 p-4 pt-0",
                className
            )}
        >
            {renderBody()}
        </div>
    );
};
