"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ANALYTICS_EVENT } from "@repo/analytics/events";
import { useAnalyticsEvent } from "@repo/analytics/events-context";
import useAuth from "@repo/auth/provider";
import {
    HookFormInput,
    HookFormTextarea,
} from "@repo/design-system/components/form/hookform";
import { Button } from "@repo/design-system/components/ui/button";
import { Form } from "@repo/design-system/components/ui/form";
import useAlert from "@repo/design-system/hooks/useAlert";
import { cn } from "@repo/design-system/lib/utils";
import { getDictionary } from "@repo/internationalization/client";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Check } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { apiClient } from "@/shared/lib/client";
import { pageContainer } from "@/shared/lib/layout";
import {
    buildContactFormSchema,
    type ContactFormValues,
} from "../validations/contact";

type ContactFormClientProps = {
    readonly available: boolean;
};

export const ContactFormClient = ({ available }: ContactFormClientProps) => {
    const { dictionary, locale } = getDictionary();
    const contactCopy = dictionary.apps.web.pages.contact;
    const { errorAlert } = useAlert();
    const { user } = useAuth();
    const trackEvent = useAnalyticsEvent();

    const schema = useMemo(
        () => buildContactFormSchema(dictionary),
        [dictionary]
    );
    const form = useForm<ContactFormValues>({
        resolver: zodResolver(schema),
        defaultValues: { name: "", email: "", message: "" },
    });

    const accountEmail = user?.email;
    useEffect(() => {
        if (accountEmail && !form.getValues("email")) {
            form.setValue("email", accountEmail);
        }
    }, [accountEmail, form]);

    // `isPending` only changes on the next render, so two submits fired in the same
    // task would both read it as false and send the message twice.
    const sendingRef = useRef(false);
    const sendMessage = useMutation({
        mutationFn: (values: ContactFormValues) =>
            apiClient.contact.send({ ...values, locale }),
        onError: (error) =>
            errorAlert(handleClientError(new FormattedError(error, locale))),
        onSuccess: () => trackEvent(ANALYTICS_EVENT.generateLead),
        onSettled: () => {
            sendingRef.current = false;
        },
    });

    const onSubmit = (values: ContactFormValues) => {
        if (sendingRef.current) {
            return;
        }
        sendingRef.current = true;
        sendMessage.mutate(values);
    };

    const renderFormColumn = () => {
        if (!available) {
            return (
                <div className="flex flex-col gap-2">
                    <h2 className="font-semibold text-lg tracking-tight">
                        {contactCopy.hero.unavailable.title}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        {contactCopy.hero.unavailable.description}
                    </p>
                </div>
            );
        }

        if (sendMessage.isSuccess) {
            return (
                <output className="flex flex-col gap-2">
                    <span className="font-semibold text-lg tracking-tight">
                        {contactCopy.hero.sent.title}
                    </span>
                    <span className="text-muted-foreground text-sm">
                        {contactCopy.hero.sent.description}
                    </span>
                </output>
            );
        }

        return (
            <Form {...form}>
                <form
                    className="flex flex-col gap-5"
                    noValidate
                    onSubmit={form.handleSubmit(onSubmit)}
                >
                    <h2 className="font-semibold text-lg tracking-tight">
                        {contactCopy.hero.form.title}
                    </h2>
                    <HookFormInput
                        autoComplete="name"
                        label={contactCopy.hero.form.name}
                        name="name"
                        placeholder={contactCopy.hero.form.namePlaceholder}
                    />
                    <HookFormInput
                        autoComplete="email"
                        label={contactCopy.hero.form.email}
                        name="email"
                        placeholder={contactCopy.hero.form.emailPlaceholder}
                        type="email"
                    />
                    <HookFormTextarea
                        label={contactCopy.hero.form.message}
                        name="message"
                        placeholder={contactCopy.hero.form.messagePlaceholder}
                        rows={6}
                    />
                    <Button
                        className="w-full"
                        disabled={sendMessage.isPending}
                        loading={sendMessage.isPending}
                        size="lg"
                        type="submit"
                    >
                        {contactCopy.hero.form.cta}
                        <ArrowRight aria-hidden="true" />
                    </Button>
                </form>
            </Form>
        );
    };

    return (
        <div className={cn(pageContainer, "py-16 md:py-24")}>
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col gap-4">
                        <h1 className="max-w-[18ch] font-semibold text-4xl tracking-tight md:text-5xl">
                            {contactCopy.meta.title}
                        </h1>
                        <p className="max-w-[48ch] text-lg text-muted-foreground leading-relaxed">
                            {contactCopy.meta.description}
                        </p>
                    </div>
                    <ul className="flex flex-col divide-y border-y">
                        {contactCopy.hero.benefits.map((benefit) => (
                            <li
                                className="flex items-start gap-3 py-4"
                                key={benefit.title}
                            >
                                <Check
                                    aria-hidden="true"
                                    className="mt-1 size-4 shrink-0 text-primary"
                                />
                                <div className="flex flex-col gap-1">
                                    <p className="font-medium">
                                        {benefit.title}
                                    </p>
                                    <p className="text-muted-foreground text-sm">
                                        {benefit.description}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="w-full rounded-xl bg-card p-6 shadow-card sm:p-8 lg:self-start">
                    {renderFormColumn()}
                </div>
            </div>
        </div>
    );
};
