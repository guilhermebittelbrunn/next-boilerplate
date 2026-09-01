import Link from "next/link";
import type React from "react";

type BreadcrumbProps = {
    pageTitle: string;
    sideElement?: React.ReactNode;
    breadcrumbItems?: {
        label: string;
        href: string;
    }[];
};

const PageBreadcrumb: React.FC<BreadcrumbProps> = ({
    pageTitle,
    sideElement,
    breadcrumbItems,
}) => (
    <div className="flex flex-row justify-between">
        <div className="mb-6 flex flex-col flex-wrap items-start gap-3">
            <h2 className="font-semibold text-2xl" x-text="pageName">
                {pageTitle}
            </h2>
            <nav>
                <ol className="flex items-center gap-1.5">
                    <li>
                        <Link
                            className="inline-flex items-center gap-1.5"
                            href="/painel"
                        >
                            Início
                            <svg
                                aria-hidden="true"
                                className="stroke-current"
                                fill="none"
                                height="16"
                                viewBox="0 0 17 16"
                                width="17"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M6.0765 12.667L10.2432 8.50033L6.0765 4.33366"
                                    stroke=""
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1.2"
                                />
                            </svg>
                        </Link>
                    </li>
                    {breadcrumbItems?.map((item) => (
                        <li key={item.href}>
                            <Link
                                className="inline-flex items-center gap-1.5"
                                href={item.href}
                            >
                                {item.label}
                                <svg
                                    aria-hidden="true"
                                    className="stroke-current"
                                    fill="none"
                                    height="16"
                                    viewBox="0 0 17 16"
                                    width="17"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M6.0765 12.667L10.2432 8.50033L6.0765 4.33366"
                                        stroke=""
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="1.2"
                                    />
                                </svg>
                            </Link>
                        </li>
                    ))}
                    <li className="font-semibold text-sm">{pageTitle}</li>
                </ol>
            </nav>
        </div>
        {sideElement && (
            <div className="flex items-center justify-end gap-2">
                {sideElement}
            </div>
        )}
    </div>
);

export default PageBreadcrumb;
