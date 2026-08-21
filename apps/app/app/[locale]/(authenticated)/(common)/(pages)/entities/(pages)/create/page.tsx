"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@repo/design-system/components/ui/form";
import { getDictionary } from "@repo/internationalization/client";
import { EntityType } from "@repo/sdk/src/types";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { Container } from "@/shared/components/ui/Container";
import { Footer } from "@/shared/components/ui/Footer";
import { FormContainer } from "@/shared/components/ui/FormContainer";
import { Header } from "@/shared/components/ui/Header";
import { COMMON_ROUTES } from "../../../../paths";
import { EntityFormFields } from "../../(components)/EntityFormFields";
import { useEntityCrud } from "../../(hooks)/useEntityCrud";
import {
    buildEntityFormSchema,
    type EntityFormValues,
    entityGenreUnset,
} from "../../(validations)/entityFormSchema";

export default function CreateEntityPage() {
    const router = useRouter();
    const { dictionary, locale } = getDictionary();
    const routes = COMMON_ROUTES(dictionary, locale);
    const entitiesForm = dictionary.apps.app.pages.common.entities.form;
    const { createEntityMutation } = useEntityCrud();

    const schema = useMemo(
        () => buildEntityFormSchema(dictionary),
        [dictionary]
    );

    const form = useForm<EntityFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: "",
            description: "",
            type: EntityType.CUSTOMER,
            photo: "",
            genre: entityGenreUnset,
            birthdate: "",
            enabled: true,
        },
    });

    const onSubmit = (values: EntityFormValues) => {
        createEntityMutation.mutate(values, {
            onSuccess: () => router.push(routes.entities.list.url),
        });
    };

    return (
        <>
            <Header
                breadcrumbs={[
                    { label: routes.root.label, href: routes.root.url },
                    {
                        label: routes.entities.list.label,
                        href: routes.entities.list.url,
                    },
                ]}
                page={routes.entities.create.label}
            />
            <Container contentOnly>
                <Form {...form}>
                    <form
                        className="flex min-h-[50vh] w-full flex-1 flex-col"
                        onSubmit={form.handleSubmit(onSubmit)}
                    >
                        <Container className="p-0">
                            <FormContainer>
                                <EntityFormFields mode="create" />
                            </FormContainer>
                        </Container>
                        <Footer
                            confirmLabel={entitiesForm.save}
                            isLoading={createEntityMutation.isPending}
                            onBack={() => router.push(routes.entities.list.url)}
                            showBack
                        />
                    </form>
                </Form>
            </Container>
        </>
    );
}
