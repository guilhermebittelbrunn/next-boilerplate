"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@repo/design-system/components/ui/form";
import { getDictionary } from "@repo/internationalization/client";
import { EntityType } from "@repo/sdk/src/types";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Container } from "@/shared/components/ui/Container";
import { Footer } from "@/shared/components/ui/Footer";
import { FormContainer } from "@/shared/components/ui/FormContainer";
import { Header } from "@/shared/components/ui/Header";
import { COMMON_ROUTES } from "../../../../../paths";
import { EntityFormFields } from "../../../(components)/EntityFormFields";
import { useEntityCrud } from "../../../(hooks)/useEntityCrud";
import { useFindEntityById } from "../../../(hooks)/useFindEntityById";
import {
    buildEntityFormSchema,
    type EntityFormValues,
    resolveEntityGenreFormValue,
} from "../../../(validations)/entityFormSchema";

export function EditEntityClient() {
    const params = useParams<{ id: string }>();
    const id = typeof params.id === "string" ? params.id : undefined;
    const router = useRouter();
    const { dictionary, locale } = getDictionary();
    const routes = COMMON_ROUTES(dictionary, locale);

    const entitiesForm = dictionary.apps.app.pages.common.entities.form;
    const entityMessages = dictionary.apps.app.pages.common.entities.messages;

    const { data: entity, isLoading, isError } = useFindEntityById(id);
    const { updateEntityMutation } = useEntityCrud();

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
            genre: resolveEntityGenreFormValue(null),
            birthdate: "",
            enabled: true,
        },
    });

    useEffect(() => {
        if (entity) {
            form.reset({
                name: entity.name,
                description: entity.description,
                type: entity.type,
                photo: entity.photo ?? "",
                genre: resolveEntityGenreFormValue(entity.genre),
                birthdate: entity.birthdate ?? "",
                enabled: entity.enabled,
            });
        }
    }, [entity, form]);

    const onSubmit = (values: EntityFormValues) => {
        if (entity) {
            updateEntityMutation.mutate(
                { ...values, id: entity.id },
                {
                    onSuccess: () => router.push(routes.entities.list.url),
                }
            );
        }
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
                page={
                    id
                        ? routes.entities.update(id).label
                        : routes.entities.list.label
                }
            />
            <Container
                contentOnly
                loadError={isError ? entityMessages.loadError : null}
                loading={isLoading && !isError}
            >
                {entity ? (
                    <Form {...form}>
                        <form
                            className="flex min-h-[50vh] w-full flex-1 flex-col"
                            onSubmit={form.handleSubmit(onSubmit)}
                        >
                            <Container className="p-0">
                                <FormContainer>
                                    <EntityFormFields
                                        createdAtLabel={entitiesForm.createdAt}
                                        createdAtValue={entity.createdAt}
                                        mode="update"
                                    />
                                </FormContainer>
                            </Container>
                            <Footer
                                confirmLabel={entitiesForm.save}
                                disabled={
                                    updateEntityMutation.isPending || !entity
                                }
                                isLoading={updateEntityMutation.isPending}
                                onBack={() =>
                                    router.push(routes.entities.list.url)
                                }
                            />
                        </form>
                    </Form>
                ) : null}
            </Container>
        </>
    );
}
