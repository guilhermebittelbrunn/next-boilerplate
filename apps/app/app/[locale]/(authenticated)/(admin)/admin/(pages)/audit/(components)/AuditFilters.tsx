"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
    HookFormDateInput,
    HookFormSelect,
} from "@repo/design-system/components/form/hookform";
import { Button } from "@repo/design-system/components/ui/button";
import { Form } from "@repo/design-system/components/ui/form";
import type { SelectOption } from "@repo/design-system/components/ui/select";
import { getDictionary } from "@repo/internationalization/client";
import { UserType } from "@repo/sdk/src/types";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { FormContainer } from "@/shared/components/ui/FormContainer";
import { useListUsers } from "@/shared/hooks/useListUsers";
import type { AuditEventFilters } from "../(hooks)/useListAuditEvents";
import {
    type AuditFiltersFormValues,
    auditFiltersDefaults,
    auditUserAll,
    buildAuditFiltersSchema,
} from "../(validations)/auditFiltersSchema";

type AuditFiltersProps = {
    onApply: (filters: AuditEventFilters) => void;
};

function toQueryFilters(values: AuditFiltersFormValues): AuditEventFilters {
    return {
        ...(values.userId === auditUserAll ? {} : { userId: values.userId }),
        ...(values.from ? { from: values.from } : {}),
        ...(values.to ? { to: values.to } : {}),
    };
}

export function AuditFilters({ onApply }: AuditFiltersProps) {
    const { dictionary } = getDictionary();
    const auditFilters = dictionary.apps.app.pages.admin.auditTrail.filters;
    const { data: users } = useListUsers();

    const schema = useMemo(
        () => buildAuditFiltersSchema(dictionary),
        [dictionary]
    );

    const form = useForm<AuditFiltersFormValues>({
        resolver: zodResolver(schema),
        defaultValues: auditFiltersDefaults,
    });

    const userOptions = useMemo<SelectOption[]>(
        () => [
            { value: auditUserAll, label: auditFilters.userAll },
            ...(users ?? []).map((user) => ({
                value: user.id,
                label:
                    user.email ??
                    user.displayName ??
                    (user.type === UserType.ADMIN ? user.uid : user.id),
            })),
        ],
        [users, auditFilters.userAll]
    );

    return (
        <Form {...form}>
            <form
                className="flex w-full flex-col gap-4 rounded-xl border border-border bg-muted/50 p-4"
                onSubmit={form.handleSubmit((values) =>
                    onApply(toQueryFilters(values))
                )}
            >
                <FormContainer className="md:grid-cols-3">
                    <HookFormSelect
                        label={auditFilters.userLabel}
                        name="userId"
                        options={userOptions}
                        placeholder={auditFilters.userPlaceholder}
                        searchable
                    />
                    <HookFormDateInput
                        label={auditFilters.fromLabel}
                        name="from"
                        placeholder={auditFilters.datePlaceholder}
                    />
                    <HookFormDateInput
                        label={auditFilters.toLabel}
                        name="to"
                        placeholder={auditFilters.datePlaceholder}
                    />
                </FormContainer>
                <div className="flex flex-wrap justify-end gap-2">
                    <Button
                        onClick={() => {
                            form.reset(auditFiltersDefaults);
                            onApply({});
                        }}
                        type="button"
                        variant="outline"
                    >
                        {auditFilters.clear}
                    </Button>
                    <Button type="submit">{auditFilters.apply}</Button>
                </div>
            </form>
        </Form>
    );
}
