import { Badge } from "@repo/design-system/components/ui/badge";
import { cn } from "@repo/design-system/lib/utils";
import { getDictionary } from "@repo/internationalization/server";
import { Check } from "lucide-react";
import { pageContainer } from "@/shared/lib/layout";

const tile = "flex flex-col gap-4 rounded-xl bg-card p-6 shadow-card sm:p-8";
const tileTitle = "font-semibold text-xl tracking-tight";
const tileText = "max-w-[56ch] text-muted-foreground leading-relaxed";

export const Inherits = async () => {
    const { dictionary } = await getDictionary();
    const inheritsCopy = dictionary.apps.web.pages.home.inherits;

    return (
        <section aria-labelledby="inherits-title" className="bg-muted/40">
            <div className={cn(pageContainer, "py-20 lg:py-28")}>
                <div className="mb-12 flex flex-col gap-4">
                    <h2
                        className="max-w-[22ch] font-semibold text-3xl tracking-tight md:text-4xl"
                        id="inherits-title"
                    >
                        {inheritsCopy.title}
                    </h2>
                    <p className="max-w-[60ch] text-muted-foreground leading-relaxed">
                        {inheritsCopy.description}
                    </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                    <article
                        className={cn(tile, "md:col-span-2 lg:col-span-4")}
                    >
                        <h3 className={tileTitle}>
                            {inheritsCopy.account.title}
                        </h3>
                        <p className={tileText}>
                            {inheritsCopy.account.description}
                        </p>
                        <ul className="mt-2 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                            {inheritsCopy.account.items.map((item) => (
                                <li
                                    className="flex items-start gap-2.5 text-sm"
                                    key={item}
                                >
                                    <Check
                                        aria-hidden="true"
                                        className="mt-0.5 size-4 shrink-0 text-primary"
                                    />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </article>
                    <article className={cn(tile, "lg:col-span-2")}>
                        <h3 className={tileTitle}>
                            {inheritsCopy.admin.title}
                        </h3>
                        <p className={tileText}>
                            {inheritsCopy.admin.description}
                        </p>
                    </article>
                    <article className={cn(tile, "lg:col-span-2")}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h3 className={tileTitle}>
                                {inheritsCopy.billing.title}
                            </h3>
                            <Badge variant="secondary">
                                {inheritsCopy.optional}
                            </Badge>
                        </div>
                        <p className={tileText}>
                            {inheritsCopy.billing.description}
                        </p>
                    </article>
                    <article
                        className={cn(
                            tile,
                            "md:col-span-2 lg:col-span-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-10"
                        )}
                    >
                        <div className="flex flex-col gap-4">
                            <h3 className={tileTitle}>
                                {inheritsCopy.languages.title}
                            </h3>
                            <p className={tileText}>
                                {inheritsCopy.languages.description}
                            </p>
                        </div>
                        <dl className="divide-y rounded-lg border bg-background text-sm">
                            {inheritsCopy.languages.sample.map((sample) => (
                                <div
                                    className="flex items-center justify-between gap-4 px-4 py-3"
                                    key={sample.locale}
                                >
                                    <dt className="font-mono text-muted-foreground text-xs">
                                        {sample.locale}
                                    </dt>
                                    <dd lang={sample.locale}>{sample.text}</dd>
                                </div>
                            ))}
                        </dl>
                    </article>
                </div>
            </div>
        </section>
    );
};
