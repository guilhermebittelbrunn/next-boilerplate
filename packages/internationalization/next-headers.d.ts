/**
 * Type declaration for next/headers when the package is type-checked in isolation.
 * The actual implementation is provided by the Next.js app at runtime.
 */
declare module "next/headers" {
  export function headers(): Headers;
}
