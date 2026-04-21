"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@repo/design-system/components/ui/form";
import { getDictionary } from "@repo/internationalization/client";
import { UserType } from "@repo/sdk/src/types";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Container } from "@/shared/components/ui/Container";
import { Footer } from "@/shared/components/ui/Footer";
import { FormContainer } from "@/shared/components/ui/FormContainer";
import { Header } from "@/shared/components/ui/Header";
import { ADMIN_ROUTES } from "../../../../../paths";
import { UserFormFields } from "../../../(components)/UserFormFields";
import { useFindUserById } from "../../../(hooks)/useFindUserById";
import { useUserCrud } from "../../../(hooks)/useUserCrud";
import {
    buildUpdateUserFormSchema,
    type UpdateUserFormValues,
} from "../../../(validations)/userFormSchema";

export default function EditUserPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { dictionary, locale } = getDictionary();
    const routes = ADMIN_ROUTES(dictionary, locale);

    const adminUsersForm = dictionary.apps.app.pages.admin.users.form;
    const adminUsersMessages = dictionary.apps.app.pages.admin.users.messages;

    const { data: user, isLoading, isError } = useFindUserById(id);
    const { updateUserMutation } = useUserCrud();

    const schema = useMemo(
        () => buildUpdateUserFormSchema(dictionary),
        [dictionary]
    );

    const form = useForm<UpdateUserFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            displayName: "",
            type: UserType.COMMON,
        },
    });

    useEffect(() => {
        if (user) {
            form.reset({
                displayName: user.displayName ?? "",
                type: user.type as UserType,
            });
        }
    }, [user, form]);

    const onSubmit = (values: UpdateUserFormValues) => {
        if (user) {
            updateUserMutation.mutate(
                { ...values, id: user.id },
                { onSuccess: () => router.push(routes.users.list.url) }
            );
        }
    };

    return (
        <>
            <Header
                breadcrumbs={[
                    { label: routes.root.label, href: routes.root.url },
                    { label: routes.users.list.label, href: routes.users.list.url },
                ]}
                page={routes.users.update(id).label}
            />
            <Container
                contentOnly
                loadError={isError ? adminUsersMessages.loadError : null}
                loading={isLoading && !isError}
            >
                {user ? (
                    <Form {...form}>
                        <form
                            className="flex min-h-[50vh] w-full flex-1 flex-col"
                            onSubmit={form.handleSubmit(onSubmit)}
                        >
                            <Container className="p-0">
                                <FormContainer>
                                    <UserFormFields mode="update" />
                                </FormContainer>
                            </Container>
                            <Footer
                                confirmLabel={adminUsersForm.save}
                                disabled={updateUserMutation.isPending || !user}
                                isLoading={updateUserMutation.isPending}
                                onBack={() => router.push(routes.users.list.url)}
                            />
                        </form>
                    </Form>
                ) : null}
            </Container>
        </>
    );
}
