import { locales } from "@repo/internationalization/utils";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { z } from "zod";

const PRICE_ID_MAX = 255;

const localeSchema = z.enum(locales).optional();

export const createCheckoutSchema = z.object({
    priceId: z.string().trim().startsWith("price_").max(PRICE_ID_MAX),
    locale: localeSchema,
});

export const openPortalSchema = z.object({
    locale: localeSchema,
});

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
export type OpenPortalInput = z.infer<typeof openPortalSchema>;

type Parsed<T> = { ok: true; value: T } | { ok: false; response: Response };

const validationFailed = (): { ok: false; response: Response } => ({
    ok: false,
    response: Response.json(
        { error: { code: "VALIDATION_FAILED" } },
        { status: HTTP_STATUS.BAD_REQUEST }
    ),
});

export function parseCreateCheckout(
    body: unknown
): Parsed<CreateCheckoutInput> {
    const parsed = createCheckoutSchema.safeParse(body);
    return parsed.success
        ? { ok: true, value: parsed.data }
        : validationFailed();
}

export function parseOpenPortal(body: unknown): Parsed<OpenPortalInput> {
    const parsed = openPortalSchema.safeParse(body);
    return parsed.success
        ? { ok: true, value: parsed.data }
        : validationFailed();
}
