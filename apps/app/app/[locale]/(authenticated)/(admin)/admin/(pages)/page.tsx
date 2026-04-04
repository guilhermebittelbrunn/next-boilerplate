import type { Metadata } from "next";
import { Container } from "@/shared/components/ui/Container";
import { Header } from "@/shared/components/ui/Header";

const title = "Acme Inc";
const description = "My application.";

export const metadata: Metadata = {
  title,
  description,
};

const App = () => (
  <>
    <Header page="Home" />
    <Container>Home</Container>
  </>
);

export default App;
