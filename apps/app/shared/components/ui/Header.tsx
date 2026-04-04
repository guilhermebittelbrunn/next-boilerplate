/** biome-ignore-all lint/nursery/noShadow: <explanation> */
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@repo/design-system/components/ui/breadcrumb";
import { Fragment, type ReactNode } from "react";

type HeaderProps = {
  page: string;
  breadcrumbs?: { label: string; href: string }[];
  children?: ReactNode;
  sideElement?: ReactNode;
};

export const Header = ({
  breadcrumbs,
  page,
  children,
  sideElement,
}: HeaderProps) => (
  <header className="flex h-16 shrink-0 items-center justify-between gap-2 px-4">
    <div className="flex items-center gap-2 px-4">
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs?.map((page, index) => (
            <Fragment key={page.label}>
              {index > 0 && (
                <BreadcrumbSeparator className="hidden md:block" />
              )}
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href={page.href}>
                  {page.label}
                </BreadcrumbLink>
              </BreadcrumbItem>
            </Fragment>
          ))}
          <BreadcrumbSeparator className="hidden md:block" />
          <BreadcrumbItem>
            <BreadcrumbPage>{page}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
    {sideElement && (
      <div className="flex items-center justify-end gap-2">
        {sideElement}
      </div>
    )}
    {children}
  </header>
);
