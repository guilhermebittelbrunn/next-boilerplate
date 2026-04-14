"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@repo/design-system/components/ui/button";
import { getDictionary } from "@repo/internationalization/client";
import { FormProvider, useForm } from "react-hook-form";
import { Container } from "@/shared/components/ui/Container";
import { Header } from "@/shared/components/ui/Header";
import { ADMIN_ROUTES } from "../../../../paths";
import { UserForm } from "../../(components)/user-form";
import {
    type CreateUserFormValues,
    createUserSchema,
} from "../../(validations)/signInSchema";

export default function CreateUserPage() {
    const { dictionary } = getDictionary();
    const routes = ADMIN_ROUTES(dictionary);

    const form = useForm<CreateUserFormValues>({
        resolver: zodResolver(createUserSchema),
    });

    const onSubmit = (data: CreateUserFormValues) => {
        console.log(data);
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
            <Container footer={<Button type="submit">Salvar</Button>} showGoBack>
                <FormProvider {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <UserForm />
                    </form>
                </FormProvider>
            </Container>
        </>
    );
}
