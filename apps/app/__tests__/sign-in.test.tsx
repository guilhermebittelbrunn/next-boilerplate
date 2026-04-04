import { render } from "@testing-library/react";
import { expect, test } from "vitest";
import Page from "../app/[locale]/(unauthenticated)/sign-in-1/[[...sign-in]]/page";

test("Sign In Page", () => {
  const { container } = render(<Page />);
  expect(container).toBeDefined();
});
