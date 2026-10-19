"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import useAuth from "@repo/auth/provider";
import {
    HookFormInput,
    HookFormTextarea,
} from "@repo/design-system/components/form/hookform";
import { Button } from "@repo/design-system/components/ui/button";
import { Form } from "@repo/design-system/components/ui/form";
import useAlert from "@repo/design-system/hooks/useAlert";
import { getDictionary } from "@repo/internationalization/client";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { useMutation } from "@tanstack/react-query";
import { Check, MoveRight } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { apiClient } from "@/shared/lib/client";
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
                    <h2 className="font-medium text-lg">
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
                    <span className="font-medium text-lg">
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
                    className="flex flex-col gap-4"
                    noValidate
                    onSubmit={form.handleSubmit(onSubmit)}
                >
                    <h2 className="font-medium text-lg">
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
                        className="w-full gap-4"
                        disabled={sendMessage.isPending}
                        loading={sendMessage.isPending}
                        type="submit"
                    >
                        {contactCopy.hero.form.cta}
                        <MoveRight className="h-4 w-4" />
                    </Button>
                </form>
            </Form>
        );
    };

    return (
        <div className="w-full py-20 lg:py-40">
            <div className="container mx-auto max-w-6xl">
                <div className="grid gap-10 lg:grid-cols-2">
                    <div className="flex flex-col items-center justify-center gap-6">
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col items-center justify-center gap-2 text-center">
                                <h1 className="max-w-xl font-regular text-3xl md:text-5xl">
                                    {contactCopy.meta.title}
                                </h1>
                                <p className="max-w-sm text-center text-lg text-muted-foreground leading-relaxed tracking-tight">
                                    {contactCopy.meta.description}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            {contactCopy.hero.benefits.map((benefit) => (
                                <div
                                    className="flex flex-row items-center gap-6 text-left"
                                    key={benefit.title}
                                >
                                    <Check className="mt-2 h-4 w-4 text-primary" />
                                    <div className="flex flex-col gap-1">
                                        <p>{benefit.title}</p>
                                        <p className="text-muted-foreground text-sm">
                                            {benefit.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-center">
                        <div className="flex w-full max-w-sm flex-col gap-4 rounded-md border p-8">
                            {renderFormColumn()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
