import { cn } from "@repo/design-system/lib/utils";
import { getDictionary } from "@repo/internationalization/server";
import { pageContainer } from "@/shared/lib/layout";

const STEP_NUMBER_DIGITS = 2;

export const Steps = async () => {
    const { dictionary } = await getDictionary();
    const stepsCopy = dictionary.apps.web.pages.home.steps;

    return (
        <section aria-labelledby="steps-title" className="border-t">
            <div
                className={cn(
                    pageContainer,
                    "grid gap-10 py-20 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:py-28"
                )}
            >
                <div className="flex flex-col gap-4 lg:sticky lg:top-28 lg:self-start">
                    <h2
                        className="max-w-[20ch] font-semibold text-3xl tracking-tight md:text-4xl"
                        id="steps-title"
                    >
                        {stepsCopy.title}
                    </h2>
                    <p className="max-w-[44ch] text-muted-foreground leading-relaxed">
                        {stepsCopy.description}
                    </p>
                </div>
                <ol className="flex flex-col divide-y border-y">
                    {stepsCopy.items.map((step, index) => (
                        <li
                            className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 gap-y-2 py-8 sm:grid-cols-[3.5rem_minmax(0,1fr)]"
                            key={step.code}
                        >
                            <span
                                aria-hidden="true"
                                className="pt-0.5 font-mono text-muted-foreground text-sm tabular-nums"
                            >
                                {String(index + 1).padStart(
                                    STEP_NUMBER_DIGITS,
                                    "0"
                                )}
                            </span>
                            <div className="flex flex-col gap-2">
                                <h3 className="font-semibold text-lg tracking-tight">
                                    {step.title}
                                </h3>
                                <p className="max-w-[60ch] text-muted-foreground leading-relaxed">
                                    {step.description}
                                </p>
                                <code
                                    className="mt-1 w-fit rounded-md bg-muted px-2 py-1 font-mono text-[0.8125rem] text-foreground"
                                    translate="no"
                                >
                                    {step.code}
                                </code>
                            </div>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
};
