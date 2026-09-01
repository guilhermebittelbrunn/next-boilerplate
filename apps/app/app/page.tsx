import { getDictionary } from "@repo/internationalization/server";
import { redirect } from "next/navigation";

export default async function Home() {
    const { locale } = await getDictionary();
    redirect(`/${locale}`);
}
