"use client";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@repo/design-system/components/ui/accordion";
import { ActionsMenu } from "@repo/design-system/components/ui/action-menu";
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@repo/design-system/components/ui/alert";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@repo/design-system/components/ui/avatar";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
    ButtonGroup,
    ButtonGroupSeparator,
    ButtonGroupText,
} from "@repo/design-system/components/ui/button-group";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@repo/design-system/components/ui/card";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@repo/design-system/components/ui/collapsible";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import { Input } from "@repo/design-system/components/ui/input";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from "@repo/design-system/components/ui/input-group";
import { Kbd, KbdGroup } from "@repo/design-system/components/ui/kbd";
import { Label } from "@repo/design-system/components/ui/label";
import { Progress } from "@repo/design-system/components/ui/progress";
import {
    RadioGroup,
    RadioGroupItem,
} from "@repo/design-system/components/ui/radio-group";

import { Separator } from "@repo/design-system/components/ui/separator";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { Spinner } from "@repo/design-system/components/ui/spinner";
import { Switch } from "@repo/design-system/components/ui/switch";
import {
    Table,
    type TableProps,
} from "@repo/design-system/components/ui/table";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { Toggle } from "@repo/design-system/components/ui/toggle";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@repo/design-system/components/ui/tooltip";
import { getDictionary } from "@repo/internationalization/client";
import {
    BellIcon,
    BoxIcon,
    CheckIcon,
    ChevronRightIcon,
    CreditCardIcon,
    MailIcon,
    PlusIcon,
    SearchIcon,
    SettingsIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Container } from "@/shared/components/ui/Container";
import { Footer } from "@/shared/components/ui/Footer";
import { FormContainer } from "@/shared/components/ui/FormContainer";
import { Header } from "@/shared/components/ui/Header";
import { LanguageSwitcher } from "@/shared/components/ui/LanguageSwitcher";
import { LoadErrorState } from "@/shared/components/ui/LoadErrorState";
import Navbar from "@/shared/components/ui/Navbar";
import PageBreadcrumb from "@/shared/components/ui/PageBreadcrumb";
import { PageFormFooter } from "@/shared/components/ui/PageFormFooter";
import PanelNavbarControls from "@/shared/components/ui/PanelNavbarControls";
import ProfileDropdown from "@/shared/components/ui/ProfileDropdown";
import { ScrollToTopButton } from "@/shared/components/ui/ScrollToTopButton";
import { withLocalePath } from "@/shared/lib/localePath";
import { COMMON_ROUTES } from "../../paths";

const designSystemComponents = [
    "accordion",
    "action-menu",
    "add-button",
    "alert",
    "alert-dialog",
    "aspect-ratio",
    "avatar",
    "badge",
    "breadcrumb",
    "button",
    "button-group",
    "calendar",
    "card",
    "carousel",
    "chart",
    "checkbox",
    "collapsible",
    "combobox",
    "command",
    "context-menu",
    "dialog",
    "direction",
    "drawer",
    "dropdown-menu",
    "empty",
    "field",
    "form",
    "input",
    "input-group",
    "input-otp",
    "item",
    "kbd",
    "label",
    "menubar",
    "mode-toggle",
    "native-select",
    "navigation-menu",
    "pagination",
    "popover",
    "progress",
    "radio-group",
    "resizable",
    "responsive-image",
    "scroll-area",
    "select",
    "separator",
    "sheet",
    "sidebar",
    "skeleton",
    "slider",
    "sonner",
    "spinner",
    "switch",
    "table",
    "tabs",
    "textarea",
    "toggle",
    "toggle-group",
    "tooltip",
] as const;

type MockUser = {
    key: string;
    name: string;
    email: string;
};

const mockUsers: MockUser[] = [
    { key: "1", name: "Ana Silva", email: "ana@example.com" },
    { key: "2", name: "Bruno Costa", email: "bruno@example.com" },
];

const tableColumns: TableProps<MockUser>["columns"] = [
    { title: "Name", dataIndex: "name" },
    { title: "Email", dataIndex: "email" },
];

const FAKE_SUBMIT_DELAY_MS = 800;

const noop = () => null;

function PlaygroundSection(props: {
    id?: string;
    title: string;
    description?: string;
    children: ReactNode;
}) {
    const { id, title, description, children } = props;
    return (
        <section className="space-y-4 rounded-xl border bg-card p-5" id={id}>
            <div className="space-y-1">
                <h2 className="font-semibold text-lg">{title}</h2>
                {description ? (
                    <p className="text-muted-foreground text-sm">
                        {description}
                    </p>
                ) : null}
            </div>
            {children}
        </section>
    );
}

function PlaygroundVariants(props: { children: ReactNode }) {
    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {props.children}
        </div>
    );
}

function PlaygroundVariant(props: {
    title: string;
    children: ReactNode;
    className?: string;
}) {
    const { title, children, className } = props;
    return (
        <div
            className={`space-y-3 rounded-lg border bg-muted/20 p-4 ${className ?? ""}`}
        >
            <p className="font-medium text-sm">{title}</p>
            <div className="flex min-h-16 flex-wrap items-center gap-3">
                {children}
            </div>
        </div>
    );
}

export default function CommonPlaygroundClient() {
    const { dictionary, locale } = getDictionary();
    const playgroundHref = withLocalePath(locale, "/playground");
    const routes = COMMON_ROUTES(dictionary, locale);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState("starter");
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    const handleFakeSubmit = async () => {
        setIsSubmitting(true);
        await new Promise((resolve) =>
            setTimeout(resolve, FAKE_SUBMIT_DELAY_MS)
        );
        setIsSubmitting(false);
    };

    return (
        <>
            <Header
                breadcrumbs={[{ label: routes.root.label, href: routes.root.url }]}
                page="Playground"
            />
            <Container>
                <div className="space-y-8 pb-8">
                    <PlaygroundSection
                        description="Atalhos para navegar rapidamente pelos componentes desta pagina."
                        id="summary"
                        title="Summary"
                    >
                        <div className="rounded-lg border bg-muted/20 p-4">
                            <p className="mb-3 text-muted-foreground text-sm">
                                Clique em um item para navegar para a seção
                                correspondente.
                            </p>
                            <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {[
                                    { id: "navbar", label: "Navbar" },
                                    {
                                        id: "panel-navbar-controls",
                                        label: "PanelNavbarControls",
                                    },
                                    {
                                        id: "language-switcher",
                                        label: "LanguageSwitcher",
                                    },
                                    {
                                        id: "profile-dropdown",
                                        label: "ProfileDropdown",
                                    },
                                    {
                                        id: "page-breadcrumb",
                                        label: "PageBreadcrumb",
                                    },
                                    {
                                        id: "scroll-to-top",
                                        label: "ScrollToTopButton",
                                    },
                                    {
                                        id: "form-container",
                                        label: "FormContainer",
                                    },
                                    {
                                        id: "load-error-state",
                                        label: "LoadErrorState",
                                    },
                                    { id: "footer", label: "Footer" },
                                    {
                                        id: "page-form-footer",
                                        label: "PageFormFooter",
                                    },
                                    { id: "container", label: "Container" },
                                    {
                                        id: "ds-catalog",
                                        label: "Design System Catalog",
                                    },
                                    { id: "ds-button", label: "Button" },
                                    { id: "ds-select", label: "Select" },
                                    { id: "ds-table", label: "Table" },
                                ].map((item) => (
                                    <li key={item.id}>
                                        <button
                                            className="group flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                                            onClick={() => {
                                                document
                                                    .getElementById(item.id)
                                                    ?.scrollIntoView({
                                                        behavior: "smooth",
                                                        block: "start",
                                                    });
                                            }}
                                            type="button"
                                        >
                                            <span className="font-medium group-hover:text-foreground">
                                                {item.label}
                                            </span>
                                            <ChevronRightIcon className="size-4 text-muted-foreground group-hover:text-foreground" />
                                        </button>
                                    </li>
                                ))}
                            </ol>
                            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                                <Button
                                    onClick={() =>
                                        window.location.assign(playgroundHref)
                                    }
                                    size="sm"
                                    type="button"
                                    variant="outline"
                                >
                                    Reset playground
                                </Button>
                            </div>
                        </div>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Componentes de `apps/app/shared/components/ui` organizados por seção."
                        title="Shared UI"
                    >
                        <div className="flex flex-wrap gap-2">
                            {[
                                "Navbar",
                                "PanelNavbarControls",
                                "LanguageSwitcher",
                                "ProfileDropdown",
                                "PageBreadcrumb",
                                "FormContainer",
                                "LoadErrorState",
                                "Footer",
                                "PageFormFooter",
                                "Container",
                            ].map((componentName) => (
                                <Badge key={componentName} variant="outline">
                                    {componentName}
                                </Badge>
                            ))}
                        </div>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Composicao completa da barra superior com controles do painel."
                        id="navbar"
                        title="Navbar"
                    >
                        <Navbar />
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Controles de troca de ambiente e impersonation conforme o contexto do painel."
                        id="panel-navbar-controls"
                        title="PanelNavbarControls"
                    >
                        <PanelNavbarControls />
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Variantes principais para troca de idioma."
                        id="language-switcher"
                        title="LanguageSwitcher"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant title="Default">
                                <LanguageSwitcher />
                            </PlaygroundVariant>
                            <PlaygroundVariant title="Icon only">
                                <LanguageSwitcher icon />
                            </PlaygroundVariant>
                            <PlaygroundVariant title="Without label">
                                <LanguageSwitcher showLabel={false} />
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Abertura do menu de perfil do usuario autenticado."
                        id="profile-dropdown"
                        title="ProfileDropdown"
                    >
                        <ProfileDropdown />
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Exemplos de breadcrumb com e sem acao lateral."
                        id="page-breadcrumb"
                        title="PageBreadcrumb"
                    >
                        <div className="space-y-6 text-foreground/70 [&_a:hover]:text-foreground [&_a]:text-foreground/70 [&_li.font-semibold]:text-foreground [&_svg]:stroke-current">
                            <PageBreadcrumb
                                breadcrumbItems={[
                                    {
                                        label: "Playground",
                                        href: playgroundHref,
                                    },
                                ]}
                                pageTitle="Breadcrumb Example"
                                sideElement={
                                    <Button variant="secondary">Action</Button>
                                }
                            />
                            <PageBreadcrumb pageTitle="Simple Breadcrumb" />
                        </div>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Botao flutuante global para voltar ao topo (aparece ao rolar a pagina)."
                        id="scroll-to-top"
                        title="ScrollToTopButton"
                    >
                        <div className="space-y-3">
                            <p className="text-muted-foreground text-sm">
                                Role a pagina para baixo para ver o botao no
                                canto inferior direito.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    onClick={() =>
                                        window.scrollTo({
                                            top: document.body.scrollHeight,
                                            behavior: "smooth",
                                        })
                                    }
                                    type="button"
                                    variant="outline"
                                >
                                    Scroll to bottom (demo)
                                </Button>
                                <Button
                                    onClick={() =>
                                        window.scrollTo({
                                            top: 0,
                                            behavior: "smooth",
                                        })
                                    }
                                    type="button"
                                    variant="secondary"
                                >
                                    Scroll to top
                                </Button>
                            </div>
                        </div>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Grid responsivo para composicao de formularios."
                        id="form-container"
                        title="FormContainer"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant
                                className="md:col-span-2"
                                title="Default grid"
                            >
                                <FormContainer>
                                    <div className="rounded-md border bg-background p-3 text-sm">
                                        Field slot 1
                                    </div>
                                    <div className="rounded-md border bg-background p-3 text-sm">
                                        Field slot 2
                                    </div>
                                    <div className="rounded-md border bg-background p-3 text-sm">
                                        Field slot 3
                                    </div>
                                    <div className="rounded-md border bg-background p-3 text-sm">
                                        Field slot 4
                                    </div>
                                </FormContainer>
                            </PlaygroundVariant>
                            <PlaygroundVariant
                                className="md:col-span-2"
                                title="Custom spacing"
                            >
                                <FormContainer className="gap-6">
                                    <Input placeholder="First name" />
                                    <Input placeholder="Last name" />
                                    <Input placeholder="Email" />
                                    <Input placeholder="Phone" />
                                </FormContainer>
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Estado visual de erro para falha no carregamento."
                        id="load-error-state"
                        title="LoadErrorState"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant title="Default">
                                <LoadErrorState message="Erro mockado para visualizacao do estado de falha." />
                            </PlaygroundVariant>
                            <PlaygroundVariant title="Custom width">
                                <LoadErrorState
                                    className="w-full"
                                    message="Nao foi possivel buscar os dados. Tente novamente em instantes."
                                />
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Barra de acoes sticky para formularios e confirmacoes."
                        id="footer"
                        title="Footer"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant title="Default confirm action">
                                <Footer
                                    confirmLabel="Salvar alteracoes"
                                    isLoading={isSubmitting}
                                    onConfirm={() => {
                                        handleFakeSubmit().catch(noop);
                                    }}
                                />
                            </PlaygroundVariant>
                            <PlaygroundVariant title="Without back button">
                                <Footer
                                    confirmLabel="Continuar"
                                    onConfirm={noop}
                                    showBack={false}
                                />
                            </PlaygroundVariant>
                            <PlaygroundVariant title="Disabled state">
                                <Footer
                                    confirmLabel="Disabled"
                                    disabled
                                    onConfirm={noop}
                                />
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Footer proprio para formularios com submit e cancel."
                        id="page-form-footer"
                        title="PageFormFooter"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant
                                className="md:col-span-2"
                                title="Default"
                            >
                                <form
                                    className="w-full space-y-4"
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        handleFakeSubmit().catch(noop);
                                    }}
                                >
                                    <div className="rounded-md border bg-background p-3 text-sm">
                                        Form body (mock)
                                    </div>
                                    <PageFormFooter
                                        cancelLabel="Cancelar"
                                        isSubmitting={isSubmitting}
                                        onCancel={noop}
                                        submitLabel="Enviar"
                                    />
                                </form>
                            </PlaygroundVariant>
                            <PlaygroundVariant
                                className="md:col-span-2"
                                title="Disabled submit"
                            >
                                <form className="w-full space-y-4">
                                    <div className="rounded-md border bg-background p-3 text-sm">
                                        Validation pending
                                    </div>
                                    <PageFormFooter
                                        cancelLabel="Voltar"
                                        onCancel={noop}
                                        submitDisabled
                                        submitLabel="Salvar"
                                    />
                                </form>
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Container principal com variacoes de layout e estado."
                        id="container"
                        title="Container"
                    >
                        <div className="space-y-6">
                            <div className="rounded-lg border bg-background p-3">
                                <p className="mb-3 font-medium text-sm">
                                    Default with back button
                                </p>
                                <Container showGoBack>
                                    <div className="rounded-md border bg-muted/20 p-3 text-sm">
                                        Example content inside nested Container.
                                    </div>
                                </Container>
                            </div>
                            <div className="rounded-lg border bg-background p-3">
                                <p className="mb-3 font-medium text-sm">
                                    Loading
                                </p>
                                <Container loading>
                                    <div />
                                </Container>
                            </div>
                            <div className="rounded-lg border bg-background p-3">
                                <p className="mb-3 font-medium text-sm">
                                    Load error
                                </p>
                                <Container loadError="Falha ao carregar o recurso.">
                                    <div />
                                </Container>
                            </div>
                            <div className="rounded-lg border bg-background p-3">
                                <p className="mb-3 font-medium text-sm">
                                    Content only
                                </p>
                                <Container contentOnly>
                                    <div className="rounded-md border bg-muted/20 p-3 text-sm">
                                        Content-only layout
                                    </div>
                                </Container>
                            </div>
                        </div>
                    </PlaygroundSection>

                    <Separator />

                    <PlaygroundSection
                        description="Catalogo dos exports existentes em `packages/design-system/components/ui`."
                        id="ds-catalog"
                        title="Design System Catalog"
                    >
                        <div className="flex flex-wrap gap-2">
                            {designSystemComponents.map((componentName) => (
                                <Badge key={componentName} variant="outline">
                                    {componentName}
                                </Badge>
                            ))}
                        </div>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Variantes de `variant`, `size`, `loading` e `icon`."
                        id="ds-button"
                        title="Button"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant title="Variants">
                                <Button>Default</Button>
                                <Button variant="secondary">Secondary</Button>
                                <Button variant="outline">Outline</Button>
                                <Button variant="ghost">Ghost</Button>
                                <Button variant="destructive">
                                    Destructive
                                </Button>
                                <Button variant="link">Link</Button>
                            </PlaygroundVariant>
                            <PlaygroundVariant title="Sizes">
                                <Button size="xs">XS</Button>
                                <Button size="sm">SM</Button>
                                <Button size="default">Default</Button>
                                <Button size="lg">LG</Button>
                            </PlaygroundVariant>
                            <PlaygroundVariant title="States">
                                <Button icon={<PlusIcon />}>With icon</Button>
                                <Button loading>Loading</Button>
                                <Button disabled variant="outline">
                                    Disabled
                                </Button>
                                <Button size="icon" variant="secondary">
                                    <SettingsIcon />
                                </Button>
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Variantes visuais de badge."
                        title="Badge"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant title="Variants">
                                <Badge>Default</Badge>
                                <Badge variant="secondary">Secondary</Badge>
                                <Badge variant="outline">Outline</Badge>
                                <Badge variant="destructive">Destructive</Badge>
                                <Badge variant="ghost">Ghost</Badge>
                                <Badge variant="link">Link</Badge>
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Uso de `CardHeader`, `CardContent` e `CardFooter`."
                        title="Card"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant title="Simple card">
                                <Card className="w-full max-w-sm">
                                    <CardHeader>
                                        <CardTitle>Team plan</CardTitle>
                                        <CardDescription>
                                            Best for teams that need
                                            collaboration.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm">
                                            Includes 10 seats and priority
                                            support.
                                        </p>
                                    </CardContent>
                                    <CardFooter>
                                        <Button className="w-full">
                                            Choose plan
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Estados de controle e desabilitado."
                        title="Checkbox"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant title="States">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        checked={acceptTerms}
                                        id="accept-terms"
                                        onCheckedChange={(value) =>
                                            setAcceptTerms(Boolean(value))
                                        }
                                    />
                                    <Label htmlFor="accept-terms">
                                        Accept terms
                                    </Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        defaultChecked
                                        disabled
                                        id="checked-disabled"
                                    />
                                    <Label htmlFor="checked-disabled">
                                        Checked disabled
                                    </Label>
                                </div>
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Variacoes de tamanho e estado."
                        title="Switch"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant title="Sizes">
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={notificationsEnabled}
                                        onCheckedChange={
                                            setNotificationsEnabled
                                        }
                                    />
                                    <span className="text-sm">Default</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch defaultChecked size="sm" />
                                    <span className="text-sm">Small</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch disabled />
                                    <span className="text-sm">Disabled</span>
                                </div>
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Grupo de escolhas com estado controlado."
                        title="RadioGroup"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant title="Controlled">
                                <RadioGroup
                                    onValueChange={setSelectedPlan}
                                    value={selectedPlan}
                                >
                                    <div className="flex items-center gap-2">
                                        <RadioGroupItem
                                            id="plan-starter"
                                            value="starter"
                                        />
                                        <Label htmlFor="plan-starter">
                                            Starter
                                        </Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <RadioGroupItem
                                            id="plan-pro"
                                            value="pro"
                                        />
                                        <Label htmlFor="plan-pro">Pro</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <RadioGroupItem
                                            id="plan-enterprise"
                                            value="enterprise"
                                        />
                                        <Label htmlFor="plan-enterprise">
                                            Enterprise
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Variações de tamanho, placeholder e disabled."
                        title="Input"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant title="Text inputs">
                                <Input placeholder="Default input" />
                                <Input disabled placeholder="Disabled input" />
                                <Input defaultValue="Filled value" />
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Textarea base com e sem valor inicial."
                        title="Textarea"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant title="Textarea states">
                                <Textarea placeholder="Type your message" />
                                <Textarea defaultValue="Existing multi-line content." />
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Label associado a campos e textos auxiliares."
                        title="Label"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant title="Field labels">
                                <div className="grid w-full gap-2">
                                    <Label htmlFor="label-email">Email</Label>
                                    <Input
                                        id="label-email"
                                        placeholder="email@example.com"
                                    />
                                </div>
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Composicoes com addon, botao e alinhamentos."
                        title="InputGroup"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant title="Inline start and end">
                                <InputGroup>
                                    <InputGroupAddon align="inline-start">
                                        <MailIcon className="size-4" />
                                    </InputGroupAddon>
                                    <InputGroupInput placeholder="email@example.com" />
                                    <InputGroupAddon align="inline-end">
                                        <InputGroupButton>
                                            Send
                                        </InputGroupButton>
                                    </InputGroupAddon>
                                </InputGroup>
                            </PlaygroundVariant>
                            <PlaygroundVariant title="Search field">
                                <InputGroup>
                                    <InputGroupAddon align="inline-start">
                                        <SearchIcon className="size-4" />
                                    </InputGroupAddon>
                                    <InputGroupInput placeholder="Search users" />
                                </InputGroup>
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Agrupamento de botoes e separadores."
                        title="ButtonGroup"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant title="Navigation group">
                                <ButtonGroup>
                                    <Button size="sm" variant="outline">
                                        Prev
                                    </Button>
                                    <ButtonGroupSeparator />
                                    <ButtonGroupText>Page 1</ButtonGroupText>
                                    <ButtonGroupSeparator />
                                    <Button size="sm" variant="outline">
                                        Next
                                    </Button>
                                </ButtonGroup>
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Representacao de atalhos de teclado."
                        title="Kbd"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant title="Shortcut groups">
                                <KbdGroup>
                                    <Kbd>Cmd</Kbd>
                                    <Kbd>K</Kbd>
                                </KbdGroup>
                                <KbdGroup>
                                    <Kbd>Shift</Kbd>
                                    <Kbd>Enter</Kbd>
                                </KbdGroup>
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Avatar com imagem e fallback."
                        title="Avatar"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant title="Image and fallback">
                                <Avatar>
                                    <AvatarImage src="https://github.com/shadcn.png" />
                                    <AvatarFallback>GB</AvatarFallback>
                                </Avatar>
                                <Avatar>
                                    <AvatarFallback>AB</AvatarFallback>
                                </Avatar>
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Alerts com variante default e destructive."
                        title="Alert"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant title="Default">
                                <Alert>
                                    <BellIcon />
                                    <AlertTitle>Heads up!</AlertTitle>
                                    <AlertDescription>
                                        This is a mock alert message for visual
                                        validation.
                                    </AlertDescription>
                                </Alert>
                            </PlaygroundVariant>
                            <PlaygroundVariant title="Destructive">
                                <Alert variant="destructive">
                                    <CreditCardIcon />
                                    <AlertTitle>Payment failed</AlertTitle>
                                    <AlertDescription>
                                        Review the saved card details and try
                                        again.
                                    </AlertDescription>
                                </Alert>
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Tooltip com gatilho via `asChild`."
                        title="Tooltip"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant title="Default">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="outline">
                                                Hover me
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            Tooltip content
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Estados visuais de progresso."
                        title="Progress"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant title="Different values">
                                <div className="grid w-full gap-3">
                                    <Progress value={20} />
                                    <Progress value={66} />
                                    <Progress value={100} />
                                </div>
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Placeholders para carregamento."
                        title="Skeleton"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant title="Text and avatar">
                                <div className="flex w-full items-center gap-3">
                                    <Skeleton className="size-10 rounded-full" />
                                    <div className="flex flex-1 flex-col gap-2">
                                        <Skeleton className="h-4 w-1/2" />
                                        <Skeleton className="h-4 w-2/3" />
                                    </div>
                                </div>
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Indicador simples de processamento."
                        title="Spinner"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant title="Sizes">
                                <Spinner className="size-4" />
                                <Spinner className="size-6" />
                                <Spinner className="size-8" />
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Componente toggle com variantes e tamanhos."
                        title="Toggle"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant title="Variants">
                                <Toggle aria-label="Bold">Default</Toggle>
                                <Toggle aria-label="Italic" variant="outline">
                                    Outline
                                </Toggle>
                                <Toggle
                                    aria-label="Small"
                                    size="sm"
                                    variant="outline"
                                >
                                    Small
                                </Toggle>
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Abas horizontais com conteudo separado."
                        title="Tabs"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant
                                className="md:col-span-2"
                                title="Default tabs"
                            >
                                <Tabs
                                    className="w-full"
                                    defaultValue="overview"
                                >
                                    <TabsList>
                                        <TabsTrigger value="overview">
                                            Overview
                                        </TabsTrigger>
                                        <TabsTrigger value="details">
                                            Details
                                        </TabsTrigger>
                                        <TabsTrigger value="billing">
                                            Billing
                                        </TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="overview">
                                        <p className="text-sm">
                                            Overview content.
                                        </p>
                                    </TabsContent>
                                    <TabsContent value="details">
                                        <p className="text-sm">
                                            Details content.
                                        </p>
                                    </TabsContent>
                                    <TabsContent value="billing">
                                        <p className="text-sm">
                                            Billing content.
                                        </p>
                                    </TabsContent>
                                </Tabs>
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Accordion de item unico expansivel."
                        title="Accordion"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant
                                className="md:col-span-2"
                                title="Single collapsible"
                            >
                                <Accordion
                                    className="w-full"
                                    collapsible
                                    type="single"
                                >
                                    <AccordionItem value="item-1">
                                        <AccordionTrigger>
                                            What is this?
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            A simple accordion example for
                                            playground usage.
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="item-2">
                                        <AccordionTrigger>
                                            Can I customize it?
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            Yes, this section demonstrates
                                            multiple items.
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Conteudo expansivel manual."
                        title="Collapsible"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant title="Default">
                                <Collapsible className="w-full">
                                    <CollapsibleTrigger asChild>
                                        <Button variant="outline">
                                            Toggle Collapsible
                                        </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="pt-3 text-sm">
                                        Collapsible content example.
                                    </CollapsibleContent>
                                </Collapsible>
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Tabela com busca local e refresh action."
                        id="ds-table"
                        title="Table"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant
                                className="md:col-span-2 xl:col-span-3"
                                title="Searchable table"
                            >
                                <div className="w-full">
                                    <Table
                                        columns={tableColumns}
                                        dataSource={mockUsers}
                                        onRefresh={noop}
                                        pagination={false}
                                        searchFields={["name", "email"]}
                                    />
                                </div>
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Estado vazio com media, header e content."
                        title="Empty"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant title="With icon media">
                                <Empty className="min-h-40 w-full">
                                    <EmptyHeader>
                                        <EmptyMedia variant="icon">
                                            <BoxIcon />
                                        </EmptyMedia>
                                        <EmptyTitle>No records</EmptyTitle>
                                        <EmptyDescription>
                                            Add your first record to see it
                                            listed.
                                        </EmptyDescription>
                                    </EmptyHeader>
                                    <EmptyContent>
                                        <Button size="sm">Create item</Button>
                                    </EmptyContent>
                                </Empty>
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Menu de acoes contextuais para linhas e cards."
                        title="ActionsMenu"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant title="Default actions">
                                <ActionsMenu
                                    items={[
                                        {
                                            icon: (
                                                <CheckIcon className="size-4" />
                                            ),
                                            key: "approve",
                                            label: "Approve",
                                        },
                                    ]}
                                    onDelete={noop}
                                    onEdit={noop}
                                />
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>
                </div>
            </Container>
            <ScrollToTopButton />
        </>
    );
}
