import { NotFoundPage } from "@/shared/components/ui/NotFoundPage";
import { CommonPlaygroundClient } from "./playground-client";

export default function CommonPlaygroundPage() {
    return (
        <div className="space-y-8 pb-8">
            <CommonPlaygroundClient />
            <section className="space-y-3 rounded-xl border bg-card p-4">
                <h2 className="font-semibold text-lg">NotFoundPage</h2>
                <NotFoundPage />
            </section>
        </div>
    );
}
