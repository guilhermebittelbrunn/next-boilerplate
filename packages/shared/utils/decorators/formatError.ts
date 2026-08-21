/* eslint-disable @typescript-eslint/no-explicit-any */
/** biome-ignore-all lint/suspicious/noExplicitAny: <explanation> */

import FormattedError from "../helpers/formattedError";

/**
 * Gets the error that was thrown by the request and format it into a {@link FormattedError}
 * Uses Stage 3 decorator API (value, context) so it works with TypeScript 5+ without experimentalDecorators.
 */
export default function FormatError() {
    return <T>(
        value: (...args: any[]) => Promise<T>,
        _context: { readonly kind: "method"; readonly name: string | symbol }
    ): ((...args: any[]) => Promise<T>) =>
        async function (this: unknown, ...args: any[]) {
            try {
                return await value.apply(this, args);
            } catch (error) {
                throw new FormattedError(error);
            }
        };
}
