import type { Locale } from "@repo/internationalization/utils";
import type { ReactElement } from "react";
import type { EmailCopy } from "./copy";

export type EmailTemplate<TData> = {
    readonly id: string;
    readonly subject: (copy: EmailCopy, data: TData) => string;
    readonly render: (args: { locale: Locale; data: TData }) => ReactElement;
};
