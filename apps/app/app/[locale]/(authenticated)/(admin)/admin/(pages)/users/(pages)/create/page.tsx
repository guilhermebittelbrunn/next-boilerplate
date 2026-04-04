import { Button } from "@repo/design-system/components/ui/button";
import { getDictionary } from "@repo/internationalization/server";
import { Container } from "@/shared/components/ui/Container";
import { Header } from "@/shared/components/ui/Header";
import { ADMIN_ROUTES } from "../../../../paths";
import { UserForm } from "../../(components)/user-form";

export default async function CreateUserPage() {
    const { dictionary } = await getDictionary();
    const routes = ADMIN_ROUTES(dictionary);

    return (
        <>
            <Header
                breadcrumbs={[
                    {
                        label: routes.root.label,
                        href: routes.root.url,
                    },
                    {
                        label: routes.users.list.label,
                        href: routes.users.list.url,
                    },
                ]}
                page={routes.users.create.label}
            />
            <Container footer={<Button>Salvar</Button>} showGoBack>
                <UserForm />
            </Container>
        </>
    );
}
