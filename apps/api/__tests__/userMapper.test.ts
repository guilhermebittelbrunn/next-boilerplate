import { Timestamp } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";
import { userMapper } from "@/(shared)/mappers/user.mapper";

const CREATED_AT = new Date("2026-01-02T03:04:05.000Z");
const ACCESSED_AT = new Date("2026-02-03T04:05:06.000Z");
const EVENT_AT = new Date("2026-03-04T05:06:07.000Z");

const stamp = (date: Date) => Timestamp.fromDate(date);

describe("userMapper.toDTO", () => {
    it("turns the profile instants into Date at the same instant", () => {
        const dto = userMapper.toDTO({
            id: "p1",
            createdAt: stamp(CREATED_AT),
            updatedAt: stamp(CREATED_AT),
            lastAccessAt: stamp(ACCESSED_AT),
            deletedAt: null,
        });

        expect(dto.createdAt).toBeInstanceOf(Date);
        expect(dto.createdAt.getTime()).toBe(CREATED_AT.getTime());
        expect(dto.updatedAt).toBeInstanceOf(Date);
        expect(dto.lastAccessAt).toEqual(ACCESSED_AT);
        expect(dto.deletedAt).toBeNull();
    });

    it("turns the nested instants into Date and keeps a null period end", () => {
        const dto = userMapper.toDTO({
            id: "p1",
            onboarding: { step: "preferences", completedAt: stamp(EVENT_AT) },
            subscription: {
                subscriptionId: "sub_1",
                status: "active",
                currentPeriodEnd: null,
                lastEventAt: stamp(EVENT_AT),
            },
            entitlements: { features: ["pro"], lastEventAt: stamp(EVENT_AT) },
        });

        expect(dto.onboarding?.completedAt).toEqual(EVENT_AT);
        expect(dto.onboarding?.step).toBe("preferences");
        expect(dto.subscription?.lastEventAt).toEqual(EVENT_AT);
        expect(dto.subscription?.currentPeriodEnd).toBeNull();
        expect(dto.subscription?.status).toBe("active");
        expect(dto.entitlements?.lastEventAt).toEqual(EVENT_AT);
        expect(dto.entitlements?.features).toEqual(["pro"]);
    });

    it("converts a stored period end as well", () => {
        const dto = userMapper.toDTO({
            id: "p1",
            subscription: {
                currentPeriodEnd: stamp(EVENT_AT),
                lastEventAt: stamp(EVENT_AT),
            },
        });

        expect(dto.subscription?.currentPeriodEnd).toEqual(EVENT_AT);
    });

    it("leaves absent fields absent instead of filling them", () => {
        const dto = userMapper.toDTO({ id: "p1", reference_id: "uid-1" });

        expect("onboarding" in dto).toBe(false);
        expect("lastAccessAt" in dto).toBe(false);
        expect("subscription" in dto).toBe(false);
        expect("entitlements" in dto).toBe(false);
        expect("createdAt" in dto).toBe(false);
    });

    it("keeps a null onboarding null", () => {
        const dto = userMapper.toDTO({ id: "p1", onboarding: null });

        expect(dto.onboarding).toBeNull();
    });

    it("passes every non-instant field through, including unknown ones", () => {
        const dto = userMapper.toDTO({
            id: "p1",
            type: "common",
            reference_id: "uid-1",
            stripeCustomerId: "cus_1",
            preferences: { theme: "dark", locale: "en" },
            legacyFlag: true,
        });

        expect(dto).toEqual({
            id: "p1",
            type: "common",
            reference_id: "uid-1",
            stripeCustomerId: "cus_1",
            preferences: { theme: "dark", locale: "en" },
            legacyFlag: true,
        });
    });

    it("keeps a Date from a profile created in the same request", () => {
        const dto = userMapper.toDTO({
            id: "p1",
            createdAt: CREATED_AT,
            updatedAt: CREATED_AT,
            deletedAt: null,
        });

        expect(dto.createdAt).toBe(CREATED_AT);
    });

    it("reads an ISO string as Date and hands an unreadable value back as stored", () => {
        const dto = userMapper.toDTO({
            id: "p1",
            createdAt: CREATED_AT.toISOString(),
            updatedAt: "not-a-date",
        });

        expect(dto.createdAt).toEqual(CREATED_AT);
        expect(dto.updatedAt).toBe("not-a-date");
    });

    it("does not mutate the stored row", () => {
        const subscription = { lastEventAt: stamp(EVENT_AT) };
        const row = { id: "p1", createdAt: stamp(CREATED_AT), subscription };

        userMapper.toDTO(row);

        expect(row.createdAt).toBeInstanceOf(Timestamp);
        expect(subscription.lastEventAt).toBeInstanceOf(Timestamp);
    });
});
