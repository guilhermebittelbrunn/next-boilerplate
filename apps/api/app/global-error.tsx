"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { fonts } from "@repo/design-system/lib/fonts";
import type NextError from "next/error";

type GlobalErrorProperties = {
  readonly error: NextError & { digest?: string };
  readonly reset: () => void;
};

const GlobalError = ({ error, reset }: GlobalErrorProperties) => {
  // Log error to console in development
  if (process.env.NODE_ENV === "development") {
    console.error("Global error:", error);
  }

  return (
    <html className={fonts} lang="pt-BR">
      <body>
        <h1>Oops, algo deu errado</h1>
        <Button onClick={() => reset()}>Tentar novamente</Button>
      </body>
    </html>
  );
};

export default GlobalError;
