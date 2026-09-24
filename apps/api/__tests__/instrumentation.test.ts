import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    type MockInstance,
    vi,
} from "vitest";

const { getFirestoreAdminMock } = vi.hoisted(() => ({
    getFirestoreAdminMock: vi.fn(),
}));

vi.mock("@repo/auth/server", () => ({
    getFirestoreAdmin: getFirestoreAdminMock,
}));

const { onRequestError, register } = await import("@/instrumentation");

const MISSING_CREDENTIALS_MESSAGE =
    /Firebase Admin credentials are not configured/;

const originalRuntime = process.env.NEXT_RUNTIME;

beforeEach(() => {
    getFirestoreAdminMock.mockReset();
    getFirestoreAdminMock.mockReturnValue({});
});

afterEach(() => {
    if (originalRuntime === undefined) {
        Reflect.deleteProperty(process.env, "NEXT_RUNTIME");
        return;
    }
    process.env.NEXT_RUNTIME = originalRuntime;
});

describe("instrumentation register", () => {
    it("resolves the Firestore instance when the server boots", async () => {
        process.env.NEXT_RUNTIME = "nodejs";

        await register();

        expect(getFirestoreAdminMock).toHaveBeenCalledTimes(1);
    });

    it("crashes the boot when the service account is not configured", async () => {
        process.env.NEXT_RUNTIME = "nodejs";
        getFirestoreAdminMock.mockImplementation(() => {
            throw new Error(
                "Firebase Admin credentials are not configured. Please set FIREBASE_ADMIN_* environment variables."
            );
        });

        await expect(register()).rejects.toThrow(MISSING_CREDENTIALS_MESSAGE);
    });

    describe("half-configured Stripe", () => {
        let warn: MockInstance<typeof console.warn>;

        beforeEach(() => {
            process.env.NEXT_RUNTIME = "nodejs";
            vi.stubEnv("ARCJET_KEY", "ajkey_qa");
            warn = vi.spyOn(console, "warn").mockImplementation(() => {
                // asserted below, kept out of the test output
            });
        });

        afterEach(() => {
            vi.unstubAllEnvs();
            warn.mockRestore();
        });

        const paymentsWarnings = () =>
            warn.mock.calls.filter(([line]) =>
                String(line).startsWith("[payments]")
            );

        it("names the missing webhook secret when only the secret key is set", async () => {
            vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_offline_qa");
            vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");

            await register();

            expect(paymentsWarnings()).toEqual([
                [
                    "[payments] billing is DISABLED (no STRIPE_WEBHOOK_SECRET). Set both Stripe keys or neither.",
                ],
            ]);
        });

        it("names the missing secret key when only the webhook secret is set", async () => {
            vi.stubEnv("STRIPE_SECRET_KEY", "");
            vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_offline_qa");

            await register();

            expect(paymentsWarnings()).toEqual([
                [
                    "[payments] billing is DISABLED (no STRIPE_SECRET_KEY). Set both Stripe keys or neither.",
                ],
            ]);
        });

        it("stays silent with both keys", async () => {
            vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_offline_qa");
            vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_offline_qa");

            await register();

            expect(paymentsWarnings()).toEqual([]);
        });

        it("stays silent with neither, which is the shipped default", async () => {
            vi.stubEnv("STRIPE_SECRET_KEY", "");
            vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");

            await register();

            expect(paymentsWarnings()).toEqual([]);
            expect(getFirestoreAdminMock).toHaveBeenCalledTimes(1);
        });
    });

    it("stays out of the way on the edge runtime", async () => {
        process.env.NEXT_RUNTIME = "edge";

        await register();

        expect(getFirestoreAdminMock).not.toHaveBeenCalled();
    });
});

describe("instrumentation onRequestError", () => {
    const errorRequest = { path: "/entities", method: "POST", headers: {} };
    const errorContext = {
        routerKind: "App Router",
        routePath: "/entities",
        routeType: "route",
        revalidateReason: undefined,
    } as const;

    const silence = (method: "warn" | "error") =>
        vi.spyOn(console, method).mockImplementation(() => {
            // recorded by the assertions below, kept out of the test output
        });

    let warn: ReturnType<typeof silence>;
    let error: ReturnType<typeof silence>;

    beforeEach(() => {
        warn = silence("warn");
        error = silence("error");
    });

    afterEach(() => {
        warn.mockRestore();
        error.mockRestore();
    });

    it("emits one structured line naming route, method and digest", () => {
        onRequestError?.(
            Object.assign(new Error("boom"), { digest: "1837465920" }),
            errorRequest,
            errorContext
        );

        expect(warn).toHaveBeenCalledWith(
            "[request] failed method=POST path=/entities routeType=route digest=1837465920"
        );
    });

    it("omits the digest when the error carries none", () => {
        onRequestError?.(new Error("boom"), errorRequest, errorContext);

        expect(warn).toHaveBeenCalledWith(
            "[request] failed method=POST path=/entities routeType=route"
        );
    });

    /**
     * An unhandled error is printed by the runtime regardless, so passing the object
     * through buys correlation rather than exposure.
     */
    it("still hands the error object to the runtime", () => {
        const thrown = new Error("boom");

        onRequestError?.(thrown, errorRequest, errorContext);

        expect(error).toHaveBeenCalledWith(thrown);
    });

    it("survives a value that is not an error at all", () => {
        expect(() =>
            onRequestError?.("just a string", errorRequest, errorContext)
        ).not.toThrow();
        expect(() =>
            onRequestError?.(null, errorRequest, errorContext)
        ).not.toThrow();
    });

    /**
     * The line is what a support ticket is matched against: the caller quotes the
     * identifier shown in the error alert, and it has to appear here to be found.
     */
    it("carries the identifier the caller was shown", () => {
        onRequestError?.(
            new Error("boom"),
            {
                ...errorRequest,
                headers: {
                    "x-request-id": "3f2a1b8c-0f4a-4d0a-9e77-9f5f0a3a1c22",
                },
            },
            errorContext
        );

        expect(warn).toHaveBeenCalledWith(
            "[request] failed method=POST path=/entities routeType=route requestId=3f2a1b8c-0f4a-4d0a-9e77-9f5f0a3a1c22"
        );
    });

    /**
     * A query string holds whatever the caller typed, and the panel searches records
     * by e-mail, so retaining it would put an address in the log.
     */
    it("drops the query string from the path", () => {
        onRequestError?.(
            new Error("boom"),
            {
                ...errorRequest,
                path: "/users?search=alguem%40example.com",
            },
            errorContext
        );

        expect(warn).toHaveBeenCalledWith(
            "[request] failed method=POST path=/users routeType=route"
        );
    });
});
