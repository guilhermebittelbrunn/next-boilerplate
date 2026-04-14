"use client";

/** biome-ignore-all lint/complexity/noUselessFragments: <explanation> */
import { Button } from "@repo/design-system/components/ui/button";
import { Spinner } from "@repo/design-system/components/ui/spinner";
import { cn } from "@repo/design-system/lib/utils";
import { useRouter } from "next/navigation";

type ContainerProps = {
    children: React.ReactNode;
    className?: string;
    loading?: boolean;
    footer?: React.ReactNode;
    showGoBack?: boolean;
};

export const Container = ({
    children,
    className,
    loading,
    footer,
    showGoBack,
}: ContainerProps) => {
    const router = useRouter();

    const handleGoBack = () => {
        if (showGoBack) {
            router.back();
        }
    };

    return (
        <div
            className={cn(
                "flex max-w-full flex-1 flex-col gap-4 p-4 pt-0",
                className
            )}
        >
            {loading ? (
                <div className="flex min-h-screen w-full flex-1 items-center justify-center rounded-xl bg-muted/50 p-4 md:min-h-min">
                    <Spinner className="size-10" />
                </div>
            ) : (
                <>
                    <div className="flex min-h-screen w-full flex-1 flex-col items-center justify-center overflow-auto rounded-xl bg-muted/50 p-4 md:min-h-min">
                        {children}
                    </div>
                    {footer && (
                        <div className="flex w-full items-end justify-end gap-4">
                            {showGoBack && (
                                <Button
                                    onClick={handleGoBack}
                                    variant="destructive"
                                >
                                    Voltar
                                </Button>
                            )}
                            {footer}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
