import { cn } from "@repo/design-system/lib/utils";
import { getDictionary } from "@repo/internationalization/server";
import { pageContainer } from "@/shared/lib/layout";

export const Quality = async () => {
    const { dictionary } = await getDictionary();
    const qualityCopy = dictionary.apps.web.pages.home.quality;

    return (
        <section aria-labelledby="quality-title">
            <div
                className={cn(
                    pageContainer,
                    "grid gap-12 py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-16 lg:py-28"
                )}
            >
                <div className="flex flex-col gap-5">
                    <h2
                        className="max-w-[20ch] font-semibold text-3xl tracking-tight md:text-4xl"
                        id="quality-title"
                    >
                        {qualityCopy.title}
                    </h2>
                    <p className="max-w-[52ch] text-muted-foreground leading-relaxed">
                        {qualityCopy.description}
                    </p>
                    <pre className="whitespace-pre-wrap break-words rounded-lg bg-foreground px-4 py-3 font-mono text-[0.8125rem] text-background dark:bg-card dark:text-foreground dark:shadow-card">
                        <code translate="no">{qualityCopy.command}</code>
                    </pre>
                </div>
                <ul className="divide-y border-y">
                    {qualityCopy.gates.map((gate) => (
                        <li
                            className="grid gap-1 py-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-6"
                            key={gate.name}
                        >
                            <span
                                className="font-medium font-mono text-sm"
                                translate="no"
                            >
                                {gate.name}
                            </span>
                            <span className="text-muted-foreground text-sm leading-relaxed">
                                {gate.description}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
};
