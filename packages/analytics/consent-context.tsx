"use client";

import { createContext, useContext } from "react";

export type CookieConsentControls = {
    /** Falso quando não há medição configurada: não há preferência a gerenciar. */
    available: boolean;
    openPreferences: () => void;
};

function ignoreOpenRequest(): void {
    // Fora do provider não existe diálogo de preferências para abrir.
}

const UNAVAILABLE: CookieConsentControls = {
    available: false,
    openPreferences: ignoreOpenRequest,
};

export const CookieConsentContext =
    createContext<CookieConsentControls>(UNAVAILABLE);

export function useCookieConsent(): CookieConsentControls {
    return useContext(CookieConsentContext);
}
