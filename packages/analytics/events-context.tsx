"use client";

import { createContext, useContext } from "react";
import type { AnalyticsEventParams } from "./events";

export type TrackAnalyticsEvent = (
    name: string,
    params?: AnalyticsEventParams
) => void;

function ignoreEvent(): void {
    // Outside the provider there is no consent to honour, so nothing is measured.
}

export const AnalyticsEventsContext =
    createContext<TrackAnalyticsEvent>(ignoreEvent);

export function useAnalyticsEvent(): TrackAnalyticsEvent {
    return useContext(AnalyticsEventsContext);
}
