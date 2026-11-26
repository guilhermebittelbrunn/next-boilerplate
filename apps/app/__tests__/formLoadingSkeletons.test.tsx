import { cleanup, render } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, describe, expect, it } from "vitest";

const { default: AccountLoading } = await import(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(pages)/(home)/loading"
);
const { default: CreateUserLoading } = await import(
    "@/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/create/loading"
);
const { default: EditUserLoading } = await import(
    "@/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/edit/[id]/loading"
);
const { default: CreateEntityLoading } = await import(
    "@/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/create/loading"
);
const { default: EditEntityLoading } = await import(
    "@/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/edit/[id]/loading"
);

afterEach(cleanup);

const narrowFormLoadings: [string, ComponentType][] = [
    ["conta", AccountLoading],
    ["criar usuário", CreateUserLoading],
    ["editar usuário", EditUserLoading],
    ["criar entidade", CreateEntityLoading],
    ["editar entidade", EditEntityLoading],
];

describe("esqueletos das telas de formulário", () => {
    it.each(narrowFormLoadings)(
        "%s carrega na coluna estreita centralizada",
        (_screen, Loading) => {
            const { container } = render(<Loading />);
            const body = container.children.item(1);

            expect(body?.className).toContain("max-w-4xl");
            expect(body?.className).toContain("mx-auto");
        }
    );
});
