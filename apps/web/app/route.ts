import { getDictionary } from "@repo/internationalization/server";
import { redirect } from "next/navigation";

// Fallback for a request to "/" that the proxy did not redirect first. A route handler, not a
// page: the root layout lives under `[locale]`, and Next.js refuses a page with no root layout.
export async function GET() {
    const { locale } = await getDictionary();
    redirect(`/${locale}`);
}
