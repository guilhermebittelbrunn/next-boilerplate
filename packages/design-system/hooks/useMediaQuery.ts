import * as React from "react"

/** Breakpoints em pixels (min-width). Abaixo do primeiro = mobile. */
export const MEDIA_BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  largeDesktop: 1280,
} as const

export type DeviceType = "mobile" | "tablet" | "desktop" | "largeDesktop"

export interface MediaQueryState {
  /** Largura < 768px */
  isMobile: boolean
  /** 768px ≤ largura < 1024px */
  isTablet: boolean
  /** 1024px ≤ largura < 1280px */
  isDesktop: boolean
  /** Largura ≥ 1280px */
  isLargeDesktop: boolean
  /** Tipo de dispositivo atual (um por vez) */
  device: DeviceType
  /** false durante SSR ou antes do primeiro layout no cliente; use para evitar hydration mismatch */
  isReady: boolean
}

function getMediaState(width: number): Omit<MediaQueryState, "isReady"> {
  const isMobile = width < MEDIA_BREAKPOINTS.tablet
  const isTablet = width >= MEDIA_BREAKPOINTS.tablet && width < MEDIA_BREAKPOINTS.desktop
  const isDesktop = width >= MEDIA_BREAKPOINTS.desktop && width < MEDIA_BREAKPOINTS.largeDesktop
  const isLargeDesktop = width >= MEDIA_BREAKPOINTS.largeDesktop

  const device: DeviceType = isLargeDesktop
    ? "largeDesktop"
    : isDesktop
      ? "desktop"
      : isTablet
        ? "tablet"
        : "mobile"

  return {
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    device,
  }
}

/**
 * Hook que detecta o tipo de dispositivo com base na largura da viewport.
 * Útil para renderização condicional via JavaScript (ex.: mostrar menu diferente em mobile).
 *
 * Para evitar hydration mismatch no Next.js, espere `isReady` ser true antes de
 * renderizar conteúdo que depende do dispositivo, ou renderize o mesmo no SSR e
 * ajuste só depois (ex.: esconder com CSS).
 *
 * @example
 * const { isMobile, device, isReady } = useMediaQuery()
 * if (!isReady) return <Skeleton />
 * return isMobile ? <MobileNav /> : <DesktopNav />
 */
export function useMediaQuery(): MediaQueryState {
  const [media, setMedia] = React.useState<MediaQueryState>({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isLargeDesktop: false,
    device: "mobile",
    isReady: false,
  })

  React.useEffect(() => {
    const update = () => {
      setMedia((prev) => ({
        ...getMediaState(window.innerWidth),
        isReady: true,
      }))
    }

    update()

    const mqlTablet = window.matchMedia(`(min-width: ${MEDIA_BREAKPOINTS.tablet}px)`)
    const mqlDesktop = window.matchMedia(`(min-width: ${MEDIA_BREAKPOINTS.desktop}px)`)
    const mqlLargeDesktop = window.matchMedia(`(min-width: ${MEDIA_BREAKPOINTS.largeDesktop}px)`)

    mqlTablet.addEventListener("change", update)
    mqlDesktop.addEventListener("change", update)
    mqlLargeDesktop.addEventListener("change", update)

    return () => {
      mqlTablet.removeEventListener("change", update)
      mqlDesktop.removeEventListener("change", update)
      mqlLargeDesktop.removeEventListener("change", update)
    }
  }, [])

  return media
}
