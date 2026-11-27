import ResponsiveImage from "@repo/design-system/components/ui/responsive-image";
import { cn } from "@repo/design-system/lib/utils";

const NAME_SUFFIXES = new Set(["jr", "jr.", "sr", "sr.", "ii", "iii", "iv"]);
const AVATAR_SIZE_PX = 36;
const EMAIL_WORD_SEPARATOR = /[._+-]+/;
const NAME_WORD_SEPARATOR = /\s+/;

type RecordAvatarProps = {
    name: string;
    src?: string | null;
    unoptimized?: boolean;
    className?: string;
};

function firstGrapheme(word: string): string {
    return Array.from(word)[0]?.toLocaleUpperCase() ?? "";
}

export function initialsOf(name: string): string {
    const trimmed = name.trim();
    const isEmail = trimmed.includes("@");
    const source = isEmail ? (trimmed.split("@")[0] ?? "") : trimmed;
    const words = source
        .split(isEmail ? EMAIL_WORD_SEPARATOR : NAME_WORD_SEPARATOR)
        .filter((word) => word && !NAME_SUFFIXES.has(word.toLowerCase()));
    if (words.length === 0) {
        return "";
    }
    const first = firstGrapheme(words[0] ?? "");
    const last = words.length > 1 ? firstGrapheme(words.at(-1) ?? "") : "";
    return `${first}${last}`;
}

export function RecordAvatar({
    name,
    src,
    unoptimized,
    className,
}: RecordAvatarProps) {
    if (src) {
        return (
            <ResponsiveImage
                alt={name}
                className={cn("shrink-0 rounded-full", className)}
                height={AVATAR_SIZE_PX}
                src={src}
                unoptimized={unoptimized}
                width={AVATAR_SIZE_PX}
            />
        );
    }

    return (
        <span
            aria-hidden="true"
            className={cn(
                "flex size-9 shrink-0 select-none items-center justify-center rounded-full bg-muted font-medium text-muted-foreground text-xs",
                className
            )}
        >
            {initialsOf(name)}
        </span>
    );
}
