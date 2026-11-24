import { describe, expect, it, vi } from "vitest";
import {
    ANALYTICS_EVENT,
    type AnalyticsEventGate,
    sendAnalyticsEvent,
} from "../events";

const MEASUREMENT_ID = "G-TEST00000";
const MEASURING: AnalyticsEventGate = {
    measuring: true,
    gaMeasurementId: MEASUREMENT_ID,
};

describe("ANALYTICS_EVENT", () => {
    it("uses the names Google Analytics recommends for the conversions", () => {
        expect(ANALYTICS_EVENT).toEqual({
            signUp: "sign_up",
            generateLead: "generate_lead",
        });
    });
});

describe("sendAnalyticsEvent", () => {
    it("sends the event to gtag when the visitor consented and a tag is configured", () => {
        const gtag = vi.fn();

        const sent = sendAnalyticsEvent({ gtag }, MEASURING, "sign_up", {
            method: "email",
        });

        expect(sent).toBe(true);
        expect(gtag).toHaveBeenCalledTimes(1);
        expect(gtag).toHaveBeenCalledWith("event", "sign_up", {
            method: "email",
        });
    });

    it("sends an event without parameters as is", () => {
        const gtag = vi.fn();

        sendAnalyticsEvent({ gtag }, MEASURING, "generate_lead");

        expect(gtag).toHaveBeenCalledWith("event", "generate_lead", undefined);
    });

    it.each([
        [
            "without consent",
            { measuring: false, gaMeasurementId: MEASUREMENT_ID },
        ],
        [
            "without a Google Analytics id",
            { measuring: true, gaMeasurementId: null },
        ],
        [
            "with an empty Google Analytics id",
            { measuring: true, gaMeasurementId: "" },
        ],
    ])("sends nothing %s", (_case, gate) => {
        const gtag = vi.fn();

        const sent = sendAnalyticsEvent({ gtag }, gate, "sign_up");

        expect(sent).toBe(false);
        expect(gtag).not.toHaveBeenCalled();
    });

    it("does not throw when gtag was never defined on the page", () => {
        expect(() =>
            sendAnalyticsEvent({}, MEASURING, "generate_lead")
        ).not.toThrow();
        expect(sendAnalyticsEvent({}, MEASURING, "generate_lead")).toBe(false);
    });
});
