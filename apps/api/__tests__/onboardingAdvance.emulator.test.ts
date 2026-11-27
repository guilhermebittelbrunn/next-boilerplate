import { randomUUID } from "node:crypto";
import { UserType } from "@repo/sdk/src/types";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getFirestoreAdmin } = await import("@repo/auth/server");
const { userRepository } = await import(
    "@/(shared)/repositories/user.repository"
);
const { advanceOnboardingState, toOnboardingStateDTO } = await import(
    "@/(shared)/lib/onboarding"
);

const RUN_ID = randomUUID();
const createdIds: string[] = [];

async function writeProfileOnLastStep(): Promise<string> {
    const ref = await getFirestoreAdmin()
        .collection("user")
        .add({
            reference_id: `emu-onboarding-${RUN_ID}`,
            type: UserType.COMMON,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
            onboarding: { step: "preferences", completedAt: null },
        });
    createdIds.push(ref.id);
    return ref.id;
}

afterAll(async () => {
    const db = getFirestoreAdmin();
    await Promise.all(
        createdIds.map((id) => db.collection("user").doc(id).delete())
    );
});

// The race only exists against a real transaction: a fake repository serializes the two
// calls by construction and would pass with or without one.
describe("userRepository.advanceOnboarding against the Firestore emulator", () => {
    it("lets only one of two concurrent completions advance the flow", async () => {
        const id = await writeProfileOnLastStep();
        const request = { step: "preferences", outcome: "completed" } as const;

        const results = await Promise.all(
            [
                new Date("2026-11-27T12:00:19.763Z"),
                new Date("2026-11-27T12:00:19.765Z"),
            ].map((now) =>
                userRepository.advanceOnboarding(id, (stored) =>
                    advanceOnboardingState(stored, request, now)
                )
            )
        );

        const advanced = results.filter(
            (result) => result?.transition.kind === "advanced"
        );
        const unchanged = results.filter(
            (result) => result?.transition.kind === "unchanged"
        );
        expect(advanced).toHaveLength(1);
        expect(unchanged).toHaveLength(1);

        const snapshot = await getFirestoreAdmin()
            .collection("user")
            .doc(id)
            .get();
        const persisted = toOnboardingStateDTO(snapshot.data()?.onboarding);
        const winner = advanced[0]?.transition;
        const loserSaw = toOnboardingStateDTO(unchanged[0]?.stored);

        expect(winner?.kind === "advanced" && winner.state.completedAt).toEqual(
            new Date(persisted?.completedAt ?? "")
        );
        expect(loserSaw?.completedAt).toBe(persisted?.completedAt);
    });

    it("answers null for a profile that no longer exists", async () => {
        const result = await userRepository.advanceOnboarding(
            `missing-${RUN_ID}`,
            () => ({ kind: "unchanged" })
        );

        expect(result).toBeNull();
    });
});
