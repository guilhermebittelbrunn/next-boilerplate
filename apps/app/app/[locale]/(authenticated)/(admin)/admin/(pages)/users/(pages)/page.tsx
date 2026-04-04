"use client";

import { AddButton } from "@repo/design-system/components/ui/add-button";
import { Button } from "@repo/design-system/components/ui/button";
import { getDictionary } from "@repo/internationalization/client";
import { useRouter } from "next/navigation";
import { Container } from "@/shared/components/ui/Container";
import { Header } from "@/shared/components/ui/Header";
import { ADMIN_ROUTES } from "../../../paths";
import { useListUsers } from "../(hooks)/useListUsers";
import { useUserCrud } from "../(hooks)/useUserCrud";

export const UsersPage = () => {
  const { data, isLoading } = useListUsers();
  const router = useRouter();
  const { dictionary } = getDictionary();
  const routes = ADMIN_ROUTES(dictionary);

  const { deleteUserMutation } = useUserCrud();

  const handleDelete = (id: string) => {
    deleteUserMutation.mutate(id);
  };

  const handleRedirectToCreate = () => {
    router.push(routes.users.create.url);
  };

  return (
    <>
      <Header
        breadcrumbs={[
          {
            label: routes.root.label,
            href: routes.root.url,
          },
        ]}
        page={routes.users.list.label}
        sideElement={<AddButton onClick={handleRedirectToCreate} />}
      />
      <Container loading={isLoading}>
        <div className="flex flex-col gap-4">
          {data?.map((user) => (
            <div className="flex items-center gap-2" key={user.id}>
              <div>{user.id}</div>
              <Button variant="outline">Editar</Button>
              <Button
                disabled={deleteUserMutation.isPending}
                onClick={() => handleDelete(user.id)}
                variant="outline"
              >
                Deletar
              </Button>
            </div>
          ))}
        </div>
      </Container>
    </>
  );
};

export default UsersPage;
