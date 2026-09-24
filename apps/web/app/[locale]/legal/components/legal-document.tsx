import Link from "next/link";

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
        <div className="container mx-auto px-4 py-20 lg:py-32">
            <article className="mx-auto flex max-w-2xl flex-col gap-8">
                <header className="flex flex-col gap-3">
                    <h1 className="font-regular text-3xl tracking-tighter md:text-5xl">
                        {doc.heading}
                    </h1>
                    <p className="rounded-md bg-muted/50 p-3 text-muted-foreground text-sm">
                        {doc.disclaimer}
                    </p>
                </header>
                <div className="flex flex-col gap-6">
                    {doc.sections.map((section) => (
                        <section
                            className="flex flex-col gap-2"
                            key={section.title}
                        >
                            <h2 className="font-medium text-xl">
                                {section.title}
                            </h2>
                            <p className="text-foreground/80 leading-relaxed">
                                {section.body}
                            </p>
                        </section>
                    ))}
                    {contact ? (
                        <section className="flex flex-col gap-2">
                            <h2 className="font-medium text-xl">
                                {contact.title}
                            </h2>
                            <p className="text-foreground/80 leading-relaxed">
                                {contact.description}
                            </p>
                            <Link
                                className="self-start underline underline-offset-4"
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
