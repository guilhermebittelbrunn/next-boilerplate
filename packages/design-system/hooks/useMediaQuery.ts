import { useCallback, useSyncExternalStore } from "react";

/** Breakpoints em pixels (min-width). Abaixo do primeiro = mobile. */
export const MEDIA_BREAKPOINTS = {
    mobile: 0,
    tablet: 768,
    desktop: 1024,
    largeDesktop: 1280,
} as const;

export type DeviceType = "mobile" | "tablet" | "desktop" | "largeDesktop";

export type MediaQueryState = {
    /** Largura < 768px */
    isMobile: boolean;
    /** 768px ≤ largura < 1024px */
    isTablet: boolean;
    /** 1024px ≤ largura < 1280px */
    isDesktop: boolean;
    /** Largura ≥ 1280px */
    isLargeDesktop: boolean;
    /** Tipo de dispositivo atual (um por vez) */
    device: DeviceType;
};

function useMediaQueryMatch(query: string): boolean {
    const subscribe = useCallback(
        (callback: () => void) => {
            const mq = window.matchMedia(query);
            mq.addEventListener("change", callback);
            return () => mq.removeEventListener("change", callback);
        },
        [query]
    );

    const getSnapshot = useCallback(
        () => window.matchMedia(query).matches,
        [query]
    );

    const getServerSnapshot = useCallback(() => false, []);

    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const DUMMY_QUERY = "(max-width: -1px)";

/**
 * Sem argumentos: retorna estado das breakpoints (isMobile, isTablet, isDesktop, isLargeDesktop, device).
 * Com query: retorna se a media query corresponde (useSyncExternalStore, seguro para SSR).
 * @example
 * const { isMobile, isLargeDesktop } = useMediaQuery()
 * const isWide = useMediaQuery('(min-width: 768px)')
 */
export function useMediaQuery(): MediaQueryState;
export function useMediaQuery(query: string): boolean;
export function useMediaQuery(query?: string): MediaQueryState | boolean {
    const effectiveQuery = query ?? DUMMY_QUERY;
    const matches = useMediaQueryMatch(effectiveQuery);
    const isMobile = useIsMobile();
    const isTablet = useIsTablet();
    const isDesktop = useIsDesktop();
    const isLargeDesktop = useIsLargeDesktop();

    if (query !== undefined) {
        return matches;
    }

    let device: DeviceType = "mobile";
    if (isLargeDesktop) {
        device = "largeDesktop";
    } else if (isDesktop) {
        device = "desktop";
    } else if (isTablet) {
        device = "tablet";
    }

    return {
        isMobile,
        isTablet,
        isDesktop,
        isLargeDesktop,
        device,
    };
}

/** Largura < 768px */
export function useIsMobile(): boolean {
    return useMediaQueryMatch(`(max-width: ${MEDIA_BREAKPOINTS.tablet - 1}px)`);
}

/** 768px ≤ largura < 1024px */
export function useIsTablet(): boolean {
    const minTablet = useMediaQueryMatch(
        `(min-width: ${MEDIA_BREAKPOINTS.tablet}px)`
    );
    const maxTablet = useMediaQueryMatch(
        `(max-width: ${MEDIA_BREAKPOINTS.desktop - 1}px)`
    );
    return minTablet && maxTablet;
}

/** 1024px ≤ largura < 1280px */
export function useIsDesktop(): boolean {
    const minDesktop = useMediaQueryMatch(
        `(min-width: ${MEDIA_BREAKPOINTS.desktop}px)`
    );
    const maxDesktop = useMediaQueryMatch(
        `(max-width: ${MEDIA_BREAKPOINTS.largeDesktop - 1}px)`
    );
    return minDesktop && maxDesktop;
}

/** Largura ≥ 1280px */
export function useIsLargeDesktop(): boolean {
    return useMediaQueryMatch(
        `(min-width: ${MEDIA_BREAKPOINTS.largeDesktop}px)`
    );
}

/**
 * Considera "large screen" quando largura ou altura é >= minWidthPx.
 */
export function useIsLargeScreen(minWidthPx = 1920): boolean {
    const isLargeByWidth = useMediaQueryMatch(`(min-width: ${minWidthPx}px)`);
    const isLargeByHeight = useMediaQueryMatch(`(min-height: ${minWidthPx}px)`);
    return isLargeByWidth || isLargeByHeight;
}
