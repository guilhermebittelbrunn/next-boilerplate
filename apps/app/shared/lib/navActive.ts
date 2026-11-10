type SearchParamsLike = Pick<URLSearchParams, "get">;

/**
 * An item without a query matches its path and every page below it; an item with a
 * query (`/account?tab=security`) only matches that exact page with those parameters.
 */
export function isNavUrlActive(
    url: string,
    pathname: string,
    searchParams: SearchParamsLike
): boolean {
    if (url === "#") {
        return false;
    }

    const [path, query] = url.split("?");

    if (!query) {
        return pathname === path || pathname.startsWith(`${path}/`);
    }

    if (pathname !== path) {
        return false;
    }

    return [...new URLSearchParams(query)].every(
        ([key, value]) => searchParams.get(key) === value
    );
}
