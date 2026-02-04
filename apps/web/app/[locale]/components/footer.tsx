import { env } from "@/env";
import { getDictionary } from "@repo/internationalization/server";
import Link from "next/link";


export async function Footer () {
  const {dictionary, locale} = await getDictionary();



  const navigationItems = [
    {
      title: dictionary.apps.web.pages.home.meta.title,
      href: `/${locale}`,
      description: "",
    },
    {
      title: dictionary.components.header.product.title,
      description: dictionary.components.header.product.description,
      items: [
        {
          title: dictionary.components.header.blog,
          href: `/${locale}/blog`,
        },
        ...(env.NEXT_PUBLIC_DOCS_URL
          ? [
              {
                  title: dictionary.components.header.docs,
                  href: env.NEXT_PUBLIC_DOCS_URL,
              },
            ]
          : []),
      ],
    },
    {
      title: "Legal",
      description: "We stay on top of the latest legal requirements.",
      items: [
        {
          title: "Privacy",
          href: `/${locale}/legal/privacy`,
        },
        {
          title: "Terms",
          href: `/${locale}/legal/terms`,
        },
      ],
    },
  ];

  return (
    <section className="border-foreground/10 border-t px-4 md:px-2">
      <div className="w-full bg-background py-8 text-foreground lg:py-16">
        <div className="container mx-auto">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="flex flex-col items-start gap-8">
              <div className="flex flex-col gap-2">
                    <h2 className="max-w-xl text-left font-regular text-3xl tracking-tighter md:text-5xl">
                      next-boilerplate
                    </h2>
                    <p className="max-w-lg text-left text-foreground/75 text-lg leading-relaxed tracking-tight">
                      {dictionary.apps.web.pages.home.meta.description}
                    </p>
              </div>
            </div>
            <div className="grid items-start gap-10 lg:grid-cols-3">
              {navigationItems.map((item) => (
                <div
                  className="flex flex-col items-start gap-1 text-base"
                  key={item.title}
                >
                  <div className="flex flex-col gap-2">
                    {item.href ? (
                      <Link
                        className="flex items-center justify-between"
                        href={item.href}
                        rel={
                          item.href.includes("http")
                            ? "noopener noreferrer"
                            : undefined
                        }
                        target={
                          item.href.includes("http") ? "_blank" : undefined
                        }
                      >
                        <span className="text-xl">{item.title}</span>
                      </Link>
                    ) : (
                      <p className="text-xl">{item.title}</p>
                    )}
                    {item.items?.map((subItem) => (
                      <Link
                        className="flex items-center justify-between"
                        href={subItem.href}
                        key={subItem.title}
                        rel={
                          subItem.href.includes("http")
                            ? "noopener noreferrer"
                            : undefined
                        }
                        target={
                          subItem.href.includes("http") ? "_blank" : undefined
                        }
                      >
                        <span className="text-foreground/75">
                          {subItem.title}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
