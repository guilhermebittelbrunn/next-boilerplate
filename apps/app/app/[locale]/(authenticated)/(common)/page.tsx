"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { useHealthCheck } from "@/app/shared/hooks/useHealthCheck";
import { Container } from "@/shared/components/ui/Container";
import { Header } from "@/shared/components/ui/Header";

const title = "Acme Inc";
const description = "My application.";

// export const metadata: Metadata = {
//   title,
//   description,
// };

const App = () => {
  // const { userId } = await auth();

  const { data, refetch } = useHealthCheck();

  // if (!userId) {
  //   notFound();
  // }

  return (
    <>
      <Header
        breadcrumbs={[
          {
            label: "Building Your Application",
            href: "/painel/building-your-application",
          },
        ]}
        page="Data Fetching"
        sideElement={
          <Button onClick={() => refetch()} variant="outline">
            teste
          </Button>
        }
      />
      {/* <PageBreadcrumb
        breadcrumbItems={[
          { label: "Eventos", href: "/painel/eventos" },
        ]}
        pageTitle="Cadastrar Evento"
      /> */}
      <Container>common</Container>
    </>
  );
};

export default App;
