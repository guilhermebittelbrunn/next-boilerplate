"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@repo/design-system/components/ui/form";
import { getDictionary } from "@repo/internationalization/client";
import { UserType } from "@repo/sdk/src/types";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { Container } from "@/shared/components/ui/Container";
import { Footer } from "@/shared/components/ui/Footer";
import { FormContainer } from "@/shared/components/ui/FormContainer";
import { FormSurface } from "@/shared/components/ui/FormSurface";
import { Header } from "@/shared/components/ui/Header";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { ADMIN_ROUTES } from "../../../../paths";
import { UserFormFields } from "../../(components)/UserFormFields";
import { useUserCrud } from "../../(hooks)/useUserCrud";
import {
    buildCreateUserFormSchema,
    type CreateUserFormValues,
} from "../../(validations)/userFormSchema";

export default function CreateUserPage() {
    const router = useRouter();
    const { dictionary, locale } = getDictionary();
    const routes = ADMIN_ROUTES(dictionary, locale);
    const adminUsersForm = dictionary.apps.app.pages.admin.users.form;
    const { createUserMutation } = useUserCrud();

    const schema = useMemo(
        () => buildCreateUserFormSchema(dictionary),
        [dictionary]
    );

    const form = useForm<CreateUserFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            email: "",
            password: "",
            confirmPassword: "",
            displayName: "",
            type: UserType.COMMON,
        },
    });

    const onSubmit = (values: CreateUserFormValues) => {
        createUserMutation.mutate(values, {
            onSuccess: () => router.push(routes.users.list.url),
        });
    };

    return (
        <>
            <Header
                breadcrumbs={[
                    { label: routes.root.label, href: routes.root.url },
                    {
                        label: routes.users.list.label,
                        href: routes.users.list.url,
                    },
                ]}
                page={routes.users.create.label}
            />
            <Container
                contentOnly
                header={<PageHeader title={routes.users.create.label} />}
                width="narrow"
            >
                <Form {...form}>
                    <form
                        className="flex w-full flex-col gap-4"
                        onSubmit={form.handleSubmit(onSubmit)}
                    >
                        <FormSurface>
                            <FormContainer>
                                <UserFormFields mode="create" />
                            </FormContainer>
                        </FormSurface>
                        <Footer
                            className="mt-2"
                            confirmLabel={adminUsersForm.save}
                            isLoading={createUserMutation.isPending}
                            onBack={() => router.push(routes.users.list.url)}
                            showBack
                        />
                    </form>
                </Form>
            </Container>
        </>
    );
}
