export const getCookie = (name: string): string | null => {
    if (typeof window === "undefined") {
        return null;
    }

    const prefix = `${name}=`;
    const entry = document.cookie
        .split(";")
        .map((part) => part.trimStart())
        .find((part) => part.startsWith(prefix));

    return entry ? entry.slice(prefix.length) : null;
};
