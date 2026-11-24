export const ANALYTICS_EVENT = {
    signUp: "sign_up",
    generateLead: "generate_lead",
} as const;

/** Google Analytics terms forbid personal data in events: no e-mail, name or id here. */
export type AnalyticsEventParams = Record<string, string | number | boolean>;

export type GtagEventCommand = (
    command: "event",
    name: string,
    params?: AnalyticsEventParams
) => void;

export type AnalyticsEventGate = {
    measuring: boolean;
    gaMeasurementId: string | null;
};

export function sendAnalyticsEvent(
    target: { gtag?: GtagEventCommand },
    gate: AnalyticsEventGate,
    name: string,
    params?: AnalyticsEventParams
): boolean {
    if (!(gate.measuring && gate.gaMeasurementId && target.gtag)) {
        return false;
    }
    target.gtag("event", name, params);
    return true;
}
