import { cn } from "@repo/design-system/lib/utils";
import Link from "next/link";
import { pageContainer } from "@/shared/lib/layout";

type LegalDoc = {
    heading: string;
    disclaimer: string;
    sections: { title: string; body: string }[];
};

export type LegalContact = {
    title: string;
    description: string;
    href: string;
    label: string;
};

export function LegalDocument({
    doc,
    contact,
}: {
    doc: LegalDoc;
    contact?: LegalContact;
}) {
    return (
        <div className={cn(pageContainer, "py-16 md:py-24")}>
            <article className="flex max-w-[68ch] flex-col gap-10">
                <header className="flex flex-col gap-4">
                    <h1 className="font-semibold text-4xl tracking-tight md:text-5xl">
                        {doc.heading}
                    </h1>
                    <p className="rounded-lg bg-muted px-4 py-3 text-muted-foreground text-sm leading-relaxed">
                        {doc.disclaimer}
                    </p>
                </header>
                <div className="flex flex-col gap-8">
                    {doc.sections.map((section) => (
                        <section
                            className="flex flex-col gap-2"
                            key={section.title}
                        >
                            <h2 className="font-semibold text-xl tracking-tight">
                                {section.title}
                            </h2>
                            <p className="text-foreground/80 leading-7">
                                {section.body}
                            </p>
                        </section>
                    ))}
                    {contact ? (
                        <section className="flex flex-col gap-2">
                            <h2 className="font-semibold text-xl tracking-tight">
                                {contact.title}
                            </h2>
                            <p className="text-foreground/80 leading-7">
                                {contact.description}
                            </p>
                            <Link
                                className="self-start text-primary underline underline-offset-4"
                                href={contact.href}
                            >
                                {contact.label}
                            </Link>
                        </section>
                    ) : null}
                </div>
            </article>
        </div>
    );
}
