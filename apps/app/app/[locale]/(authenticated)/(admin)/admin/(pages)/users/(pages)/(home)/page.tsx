"use client";

import {
  ActionsMenu,
  AddButton,
  Table,
} from "@repo/design-system/components/ui";
import ResponsiveImage from "@repo/design-system/components/ui/responsive-image";
import { getDictionary } from "@repo/internationalization/client";
import type { UserWithAuthDTO } from "@repo/sdk/src/types";
import { useRouter } from "next/navigation";
import { Container } from "@/shared/components/ui/Container";
import { Header } from "@/shared/components/ui/Header";
import { ADMIN_ROUTES } from "../../../../paths";
import { useListUsers } from "../../(hooks)/useListUsers";
import { useUserCrud } from "../../(hooks)/useUserCrud";

export const UsersPage = () => {
  const { data: users, isLoading } = useListUsers();
  const router = useRouter();
  const { dictionary } = getDictionary();
  const routes = ADMIN_ROUTES(dictionary);

  const { deleteUserMutation } = useUserCrud();

  const columns = [
    {
      title: "",
      dataIndex: "photoURL",
      render: (value: string) => (
        <div className="h-11 w-11">
          <ResponsiveImage
            alt="Foto do usuário"
            height={11}
            src={value}
            width={11}
          />
        </div>
      ),
    },
    {
      title: "Nome",
      dataIndex: "displayName",
      render: (value: string) => (
        <span className="font-bold">{value ?? "--"}</span>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
    },
    {
      title: "",
      dataIndex: "actions",
      render: (_: string, record: UserWithAuthDTO) => (
        <ActionsMenu onDelete={() => deleteUserMutation.mutate(record.uid)} />
      ),
    },
  ];

  return (
    <>
      <Header
        breadcrumbs={[{ label: routes.root.label, href: routes.root.url }]}
        page={routes.users.list.label}
        sideElement={<AddButton onClick={() => router.push(routes.users.create.url)} />}
      />
      <Container loading={isLoading}>
        <Table columns={columns} dataSource={users} />
      </Container>
    </>
  );
};

export default UsersPage;
