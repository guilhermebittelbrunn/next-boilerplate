import type { ReactNode } from "react";

type AuthCardProps = {
    readonly title: string;
    readonly description: string;
    readonly children?: ReactNode;
};

export function AuthCard({ title, description, children }: AuthCardProps) {
    return (
        <div className="flex min-h-[calc(100vh-20rem)] items-center justify-center py-20">
            <div className="w-full max-w-md space-y-8 rounded-xl border bg-card p-8 shadow-sm">
                <div className="space-y-2 text-center">
                    <h1 className="font-bold text-3xl">{title}</h1>
                    <p className="text-muted-foreground text-sm">
                        {description}
                    </p>
                </div>
                {children}
            </div>
        </div>
    );
}
