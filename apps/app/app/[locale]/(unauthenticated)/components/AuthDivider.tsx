type AuthDividerProps = {
    readonly label: string;
};

export function AuthDivider({ label }: AuthDividerProps) {
    return (
        <div className="flex items-center gap-3 text-muted-foreground text-xs">
            <span aria-hidden className="h-px flex-1 bg-border" />
            <span>{label}</span>
            <span aria-hidden className="h-px flex-1 bg-border" />
        </div>
    );
}
