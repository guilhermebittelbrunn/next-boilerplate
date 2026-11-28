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
    CardAction,
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
import { useAlert } from "@repo/design-system/hooks/useAlert";
import { cn } from "@repo/design-system/lib/utils";
import { getDictionary } from "@repo/internationalization/client";
import {
    BellIcon,
    BoxIcon,
    CheckIcon,
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
import { MetricStrip } from "@/shared/components/ui/MetricStrip";
import Navbar from "@/shared/components/ui/Navbar";
import PageBreadcrumb from "@/shared/components/ui/PageBreadcrumb";
import { PageFormFooter } from "@/shared/components/ui/PageFormFooter";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import PanelNavbarControls from "@/shared/components/ui/PanelNavbarControls";
import ProfileDropdown from "@/shared/components/ui/ProfileDropdown";
import { ScrollToTopButton } from "@/shared/components/ui/ScrollToTopButton";
import { SettingsSection } from "@/shared/components/ui/SettingsSection";
import { withLocalePath } from "@/shared/lib/localePath";
import { COMMON_ROUTES } from "../../paths";

const sectionGroups = [
    {
        label: "Fundação",
        items: [
            { id: "tokens", label: "Tokens" },
            { id: "typography", label: "Tipografia" },
        ],
    },
    {
        label: "Shell do painel",
        items: [
            { id: "page-header", label: "PageHeader" },
            { id: "settings-section", label: "SettingsSection" },
            { id: "navbar", label: "Navbar" },
            { id: "panel-navbar-controls", label: "PanelNavbarControls" },
            { id: "language-switcher", label: "LanguageSwitcher" },
            { id: "profile-dropdown", label: "ProfileDropdown" },
            { id: "page-breadcrumb", label: "PageBreadcrumb" },
            { id: "scroll-to-top", label: "ScrollToTopButton" },
            { id: "form-container", label: "FormContainer" },
            { id: "load-error-state", label: "LoadErrorState" },
            { id: "metric-strip", label: "MetricStrip" },
            { id: "footer", label: "Footer" },
            { id: "page-form-footer", label: "PageFormFooter" },
            { id: "container", label: "Container" },
        ],
    },
    {
        label: "Design system",
        items: [
            { id: "ds-button", label: "Button" },
            { id: "ds-badge", label: "Badge" },
            { id: "ds-card", label: "Card" },
            { id: "ds-fields", label: "Campos" },
            { id: "ds-table", label: "Table" },
            { id: "ds-feedback", label: "Feedback" },
            { id: "ds-overlays", label: "Sobreposições" },
            { id: "ds-disclosure", label: "Abas e expansão" },
            { id: "ds-misc", label: "Outros" },
            { id: "ds-catalog", label: "Catálogo" },
        ],
    },
] as const;

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

const sampleMetrics = [
    { key: "metric-1", label: "Métrica 1", value: 1284 },
    { key: "metric-2", label: "Métrica 2", value: 37 },
    {
        key: "metric-3",
        label: "Métrica 3",
        value: 123_456_789,
        hint: "Valor longo para testar a largura da célula",
    },
    { key: "metric-4", label: "Métrica 4", value: 0 },
];

const colorTokens = [
    { name: "background", className: "bg-background" },
    { name: "card", className: "bg-card" },
    { name: "muted", className: "bg-muted" },
    { name: "accent", className: "bg-accent" },
    { name: "border", className: "bg-border" },
    { name: "primary", className: "bg-primary" },
    { name: "success", className: "bg-success" },
    { name: "warning", className: "bg-warning" },
    { name: "destructive", className: "bg-destructive" },
] as const;

const elevationTokens = [
    { name: "shadow-card", className: "shadow-card" },
    { name: "shadow-popover", className: "shadow-popover" },
    { name: "shadow-overlay", className: "shadow-overlay" },
] as const;

const radiusTokens = [
    { name: "rounded-md · campo e botão", className: "rounded-md" },
    { name: "rounded-xl · cartão", className: "rounded-xl" },
    { name: "rounded-full · badge e avatar", className: "rounded-full" },
] as const;

type SampleStatus = "active" | "pending" | "blocked";

type SampleMember = {
    key: string;
    name: string;
    email: string;
    status: SampleStatus;
    records: number;
};

const sampleMembers: SampleMember[] = [
    {
        key: "a",
        name: "Pessoa de exemplo A",
        email: "pessoa-a@example.com",
        status: "active",
        records: 1284,
    },
    {
        key: "b",
        name: "Pessoa de exemplo B",
        email: "pessoa-b@example.com",
        status: "pending",
        records: 37,
    },
    {
        key: "c",
        name: "Pessoa de exemplo C com um nome bem mais comprido que o normal",
        email: "pessoa-c-endereco-longo@subdominio.example.com",
        status: "blocked",
        records: 0,
    },
];

const statusBadges: Record<
    SampleStatus,
    { label: string; variant: "success" | "warning" | "destructive" }
> = {
    active: { label: "Ativo", variant: "success" },
    pending: { label: "Pendente", variant: "warning" },
    blocked: { label: "Bloqueado", variant: "destructive" },
};

const sampleColumns: TableProps<SampleMember>["columns"] = [
    {
        title: "Membro",
        dataIndex: "name",
        render: (value: string, record: SampleMember) => (
            <div className="flex min-w-0 flex-col gap-0.5">
                <span className="break-words font-medium">{value}</span>
                <span className="break-all text-muted-foreground text-xs">
                    {record.email}
                </span>
            </div>
        ),
    },
    {
        title: "Situação",
        dataIndex: "status",
        render: (value: SampleStatus) => (
            <Badge variant={statusBadges[value].variant}>
                {statusBadges[value].label}
            </Badge>
        ),
    },
    {
        title: "Registros",
        dataIndex: "records",
        align: "right",
        render: (value: number) => (
            <span className="font-mono">{value.toLocaleString("pt-BR")}</span>
        ),
    },
];

const FAKE_SUBMIT_DELAY_MS = 800;

// Inline so this showcase does not oblige every fork to allow an outside image
// host in its content security policy just to render a sample avatar.
const SAMPLE_AVATAR =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='20' fill='%23475569'/%3E%3Ccircle cx='20' cy='16' r='6' fill='%23ffffff'/%3E%3Cpath d='M8 38a12 12 0 0 1 24 0z' fill='%23ffffff'/%3E%3C/svg%3E";

const noop = () => null;

function PlaygroundSection(props: {
    id: string;
    title: string;
    description?: string;
    children: ReactNode;
}) {
    const { id, title, description, children } = props;
    return (
        <section
            aria-labelledby={`${id}-title`}
            className="flex scroll-mt-24 flex-col gap-5 rounded-xl bg-card p-5 text-card-foreground shadow-card sm:p-6"
            id={id}
        >
            <div className="flex flex-col gap-1">
                <h2
                    className="font-semibold text-lg tracking-tight"
                    id={`${id}-title`}
                >
                    {title}
                </h2>
                {description ? (
                    <p className="max-w-prose text-pretty text-muted-foreground text-sm">
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
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
            className={cn(
                "flex min-w-0 flex-col gap-3 rounded-lg bg-muted/50 p-4",
                className
            )}
        >
            <p className="font-medium text-muted-foreground text-xs">{title}</p>
            <div className="flex min-h-16 flex-wrap items-center gap-3">
                {children}
            </div>
        </div>
    );
}

function PlaygroundNav() {
    return (
        <nav
            aria-label="Seções do playground"
            className="grid gap-5 rounded-xl bg-card p-5 shadow-card sm:grid-cols-3 sm:p-6"
        >
            {sectionGroups.map((group) => (
                <div className="flex flex-col gap-2" key={group.label}>
                    <p className="font-medium text-muted-foreground text-xs">
                        {group.label}
                    </p>
                    <ul className="flex flex-col">
                        {group.items.map((item) => (
                            <li key={item.id}>
                                <a
                                    className="-mx-2 block rounded-md px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/40"
                                    href={`#${item.id}`}
                                >
                                    {item.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </nav>
    );
}

export default function CommonPlaygroundClient() {
    const { dictionary, locale } = getDictionary();
    const playgroundHref = withLocalePath(locale, "/playground");
    const routes = COMMON_ROUTES(dictionary, locale);
    const { successAlert, infoAlert, warningAlert, errorAlert } = useAlert();

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
                breadcrumbs={[
                    { label: routes.root.label, href: routes.root.url },
                ]}
                page="Playground"
            />
            <Container
                header={
                    <PageHeader
                        actions={
                            <Button
                                onClick={() =>
                                    window.location.assign(playgroundHref)
                                }
                                type="button"
                                variant="outline"
                            >
                                Reiniciar playground
                            </Button>
                        }
                        description="Vitrine do sistema de interface: tokens, shell do painel e componentes do design system, cada um nos estados que importam."
                        title="Playground"
                    />
                }
            >
                <div className="flex flex-col gap-6 pb-8">
                    <PlaygroundNav />

                    <PlaygroundSection
                        description="Cores, elevação e raio vêm de packages/design-system/styles/globals.css. Componente usa o token, nunca o valor."
                        id="tokens"
                        title="Tokens"
                    >
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                            {colorTokens.map((token) => (
                                <div
                                    className="flex flex-col gap-2"
                                    key={token.name}
                                >
                                    <div
                                        className={cn(
                                            "h-12 rounded-md ring-1 ring-border ring-inset",
                                            token.className
                                        )}
                                    />
                                    <span className="font-mono text-muted-foreground text-xs">
                                        --{token.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                            <PlaygroundVariant title="Elevação">
                                {elevationTokens.map((token) => (
                                    <div
                                        className={cn(
                                            "flex h-16 min-w-28 flex-1 items-end rounded-lg bg-card p-2 font-mono text-muted-foreground text-xs",
                                            token.className
                                        )}
                                        key={token.name}
                                    >
                                        {token.name}
                                    </div>
                                ))}
                            </PlaygroundVariant>
                            <PlaygroundVariant title="Raio">
                                {radiusTokens.map((token) => (
                                    <div
                                        className="flex flex-col items-start gap-2"
                                        key={token.name}
                                    >
                                        <div
                                            className={cn(
                                                "size-12 bg-primary/15 ring-1 ring-primary/30",
                                                token.className
                                            )}
                                        />
                                        <span className="text-muted-foreground text-xs">
                                            {token.name}
                                        </span>
                                    </div>
                                ))}
                            </PlaygroundVariant>
                        </div>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Geist Sans em tudo; Geist Mono com tabular-nums onde os números se comparam."
                        id="typography"
                        title="Tipografia"
                    >
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="flex flex-col gap-3">
                                <p className="text-balance font-semibold text-2xl tracking-tight md:text-[1.75rem] md:leading-tight">
                                    Título da página (h1)
                                </p>
                                <p className="font-semibold text-lg tracking-tight">
                                    Título de seção (h2)
                                </p>
                                <p className="font-semibold tracking-tight">
                                    Título de bloco (h3)
                                </p>
                                <p className="max-w-prose text-pretty text-sm">
                                    Corpo de texto em 14 px, com no máximo 65
                                    caracteres por linha para a leitura não
                                    cansar.
                                </p>
                                <p className="text-muted-foreground text-sm">
                                    Texto de apoio em muted-foreground.
                                </p>
                            </div>
                            <div className="flex flex-col gap-2 rounded-lg bg-muted/50 p-4">
                                <p className="font-medium text-muted-foreground text-xs">
                                    Números alinhados
                                </p>
                                <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm">
                                    <dt>Plano mensal</dt>
                                    <dd className="text-right font-mono tabular-nums">
                                        R$ 49,00
                                    </dd>
                                    <dt>Plano anual</dt>
                                    <dd className="text-right font-mono tabular-nums">
                                        R$ 490,00
                                    </dd>
                                    <dt>Registros</dt>
                                    <dd className="text-right font-mono tabular-nums">
                                        1.284
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Cabeçalho de toda tela interna: um h1, a descrição opcional e as ações à direita."
                        id="page-header"
                        title="PageHeader"
                    >
                        <div className="rounded-lg bg-background p-5 ring-1 ring-border">
                            <PageHeader
                                actions={
                                    <Button icon={<PlusIcon />} type="button">
                                        Novo registro
                                    </Button>
                                }
                                description="Descrição curta do que a tela faz."
                                title="Título da tela"
                            />
                        </div>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Bloco de configuração: região nomeada pelo título, ações por último, tom destrutivo para o que não se desfaz."
                        id="settings-section"
                        title="SettingsSection"
                    >
                        <div className="flex flex-col gap-4 rounded-lg bg-background p-4 ring-1 ring-border sm:p-6">
                            <SettingsSection
                                description="Nome e telefone que a equipe vê."
                                title="Dados pessoais"
                            >
                                <FormContainer>
                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="playground-name">
                                            Nome de exibição
                                        </Label>
                                        <Input
                                            autoComplete="off"
                                            id="playground-name"
                                            name="playground-name"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="playground-phone">
                                            Telefone
                                        </Label>
                                        <Input
                                            autoComplete="off"
                                            id="playground-phone"
                                            inputMode="tel"
                                            name="playground-phone"
                                            type="tel"
                                        />
                                    </div>
                                </FormContainer>
                                <Footer
                                    confirmLabel="Salvar alterações"
                                    onConfirm={noop}
                                    showBack={false}
                                    sticky={false}
                                />
                            </SettingsSection>
                            <SettingsSection
                                description="Apaga o perfil e o acesso. Não há como desfazer."
                                title="Excluir conta"
                                tone="destructive"
                            >
                                <Button
                                    className="self-start"
                                    type="button"
                                    variant="destructive"
                                >
                                    Excluir conta
                                </Button>
                            </SettingsSection>
                        </div>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Barra superior com os controles do painel."
                        id="navbar"
                        title="Navbar"
                    >
                        <Navbar />
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Troca de ambiente e personificação conforme o contexto do painel."
                        id="panel-navbar-controls"
                        title="PanelNavbarControls"
                    >
                        <PanelNavbarControls />
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Variantes da troca de idioma."
                        id="language-switcher"
                        title="LanguageSwitcher"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant title="Padrão">
                                <LanguageSwitcher />
                            </PlaygroundVariant>
                            <PlaygroundVariant title="Só ícone">
                                <LanguageSwitcher icon />
                            </PlaygroundVariant>
                            <PlaygroundVariant title="Sem rótulo">
                                <LanguageSwitcher showLabel={false} />
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Menu de perfil do usuário autenticado."
                        id="profile-dropdown"
                        title="ProfileDropdown"
                    >
                        <ProfileDropdown />
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Breadcrumb com e sem ação lateral."
                        id="page-breadcrumb"
                        title="PageBreadcrumb"
                    >
                        <div className="flex flex-col gap-6">
                            <PageBreadcrumb
                                breadcrumbItems={[
                                    {
                                        label: "Playground",
                                        href: playgroundHref,
                                    },
                                ]}
                                pageTitle="Exemplo de breadcrumb"
                                sideElement={
                                    <Button type="button" variant="secondary">
                                        Ação
                                    </Button>
                                }
                            />
                            <PageBreadcrumb pageTitle="Breadcrumb simples" />
                        </div>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Botão flutuante para voltar ao topo; aparece depois de rolar a página."
                        id="scroll-to-top"
                        title="ScrollToTopButton"
                    >
                        <div className="flex flex-wrap gap-2">
                            <Button
                                onClick={() =>
                                    window.scrollTo({
                                        top: document.body.scrollHeight,
                                    })
                                }
                                type="button"
                                variant="outline"
                            >
                                Ir para o fim
                            </Button>
                            <Button
                                onClick={() => window.scrollTo({ top: 0 })}
                                type="button"
                                variant="secondary"
                            >
                                Ir para o topo
                            </Button>
                        </div>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Grade de campos: uma coluna no celular, duas a partir de md. Rótulo acima, erro abaixo."
                        id="form-container"
                        title="FormContainer"
                    >
                        <div className="rounded-lg bg-background p-5 ring-1 ring-border">
                            <FormContainer>
                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="playground-first-name">
                                        Nome
                                    </Label>
                                    <Input
                                        autoComplete="off"
                                        id="playground-first-name"
                                        name="playground-first-name"
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="playground-last-name">
                                        Sobrenome
                                    </Label>
                                    <Input
                                        autoComplete="off"
                                        id="playground-last-name"
                                        name="playground-last-name"
                                    />
                                </div>
                                <div className="flex flex-col gap-2 md:col-span-2">
                                    <Label htmlFor="playground-email-error">
                                        E-mail
                                    </Label>
                                    <Input
                                        aria-describedby="playground-email-error-message"
                                        aria-invalid
                                        autoComplete="off"
                                        defaultValue="pessoa@"
                                        id="playground-email-error"
                                        name="playground-email-error"
                                        type="email"
                                    />
                                    <p
                                        className="text-destructive text-sm"
                                        id="playground-email-error-message"
                                    >
                                        Informe um e-mail válido.
                                    </p>
                                </div>
                            </FormContainer>
                        </div>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Falha de carga: o que falhou e como tentar de novo."
                        id="load-error-state"
                        title="LoadErrorState"
                    >
                        <LoadErrorState message="Não foi possível carregar os dados. Tente novamente em instantes." />
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Quatro ou mais indicadores: 2 colunas no celular, 4 a partir de lg."
                        id="metric-strip"
                        title="MetricStrip"
                    >
                        <MetricStrip
                            className="overflow-hidden rounded-xl shadow-[inset_0_0_0_1px_var(--border)]"
                            items={sampleMetrics}
                            locale={locale}
                        />
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Ações de formulário. Fixo no rodapé por padrão; aqui com sticky={false} para caber na vitrine."
                        id="footer"
                        title="Footer"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant title="Com voltar e carregando">
                                <Footer
                                    className="mt-0"
                                    confirmLabel="Salvar alterações"
                                    isLoading={isSubmitting}
                                    onConfirm={() => {
                                        handleFakeSubmit().catch(noop);
                                    }}
                                    sticky={false}
                                />
                            </PlaygroundVariant>
                            <PlaygroundVariant title="Sem voltar">
                                <Footer
                                    className="mt-0"
                                    confirmLabel="Continuar"
                                    onConfirm={noop}
                                    showBack={false}
                                    sticky={false}
                                />
                            </PlaygroundVariant>
                            <PlaygroundVariant title="Desabilitado">
                                <Footer
                                    className="mt-0"
                                    confirmLabel="Salvar alterações"
                                    disabled
                                    onConfirm={noop}
                                    sticky={false}
                                />
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Rodapé próprio de formulário com enviar e cancelar."
                        id="page-form-footer"
                        title="PageFormFooter"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant
                                className="md:col-span-2 xl:col-span-3"
                                title="Padrão"
                            >
                                <form
                                    className="flex w-full flex-col gap-4"
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        handleFakeSubmit().catch(noop);
                                    }}
                                >
                                    <PageFormFooter
                                        cancelLabel="Cancelar"
                                        isSubmitting={isSubmitting}
                                        onCancel={noop}
                                        submitLabel="Enviar"
                                    />
                                </form>
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Container principal nos estados de carga e erro."
                        id="container"
                        title="Container"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant
                                className="md:col-span-2 xl:col-span-3"
                                title="Carregando"
                            >
                                <Container
                                    className="w-full px-0 pb-0 md:px-0"
                                    loading
                                />
                            </PlaygroundVariant>
                            <PlaygroundVariant
                                className="md:col-span-2 xl:col-span-3"
                                title="Erro de carga"
                            >
                                <Container
                                    className="w-full px-0 pb-0 md:px-0"
                                    loadError="Falha ao carregar o recurso."
                                />
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Um primário por tela; o resto recua para secondary, outline ou ghost."
                        id="ds-button"
                        title="Button"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant title="Variantes">
                                <Button type="button">Primário</Button>
                                <Button type="button" variant="secondary">
                                    Secundário
                                </Button>
                                <Button type="button" variant="outline">
                                    Contorno
                                </Button>
                                <Button type="button" variant="ghost">
                                    Fantasma
                                </Button>
                                <Button type="button" variant="destructive">
                                    Destrutivo
                                </Button>
                                <Button type="button" variant="link">
                                    Link
                                </Button>
                            </PlaygroundVariant>
                            <PlaygroundVariant title="Tamanhos">
                                <Button size="xs" type="button">
                                    XS
                                </Button>
                                <Button size="sm" type="button">
                                    SM
                                </Button>
                                <Button size="default" type="button">
                                    Padrão
                                </Button>
                                <Button size="lg" type="button">
                                    LG
                                </Button>
                            </PlaygroundVariant>
                            <PlaygroundVariant title="Estados">
                                <Button icon={<PlusIcon />} type="button">
                                    Com ícone
                                </Button>
                                <Button loading type="button">
                                    Salvando…
                                </Button>
                                <Button
                                    disabled
                                    type="button"
                                    variant="outline"
                                >
                                    Desabilitado
                                </Button>
                                <Button
                                    aria-label="Configurações"
                                    size="icon"
                                    type="button"
                                    variant="secondary"
                                >
                                    <SettingsIcon />
                                </Button>
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Badge tonal com texto: a cor nunca é o único sinal do estado."
                        id="ds-badge"
                        title="Badge"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant title="Status">
                                <Badge variant="success">
                                    <CheckIcon aria-hidden />
                                    Ativo
                                </Badge>
                                <Badge variant="warning">Pendente</Badge>
                                <Badge variant="destructive">Bloqueado</Badge>
                                <Badge variant="secondary">Arquivado</Badge>
                            </PlaygroundVariant>
                            <PlaygroundVariant title="Marca e neutros">
                                <Badge>Padrão</Badge>
                                <Badge variant="outline">Contorno</Badge>
                                <Badge variant="ghost">Fantasma</Badge>
                                <Badge variant="link">Link</Badge>
                            </PlaygroundVariant>
                            <PlaygroundVariant title="Contagem">
                                <Badge variant="secondary">3</Badge>
                                <Badge variant="secondary">128</Badge>
                                <Badge variant="secondary">1.284</Badge>
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Branco sobre o fundo, com anel fino e sombra difusa. Dentro dele, agrupe por espaço e divide-y."
                        id="ds-card"
                        title="Card"
                    >
                        <div className="grid gap-4 rounded-lg bg-background p-4 ring-1 ring-border sm:p-6 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardDescription>
                                        Plano atual
                                    </CardDescription>
                                    <CardTitle>Plano de exemplo</CardTitle>
                                    <CardAction>
                                        <Badge variant="success">Ativo</Badge>
                                    </CardAction>
                                </CardHeader>
                                <CardContent className="flex flex-col gap-1 text-sm">
                                    <p className="font-semibold text-2xl tabular-nums tracking-tight">
                                        R$ 49,00/mês
                                    </p>
                                    <p className="text-muted-foreground">
                                        Renova em 12/01/2027
                                    </p>
                                </CardContent>
                                <CardFooter className="border-border border-t pt-6">
                                    <Button type="button" variant="outline">
                                        Gerenciar assinatura
                                    </Button>
                                </CardFooter>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        Lista dentro do cartão
                                    </CardTitle>
                                    <CardDescription>
                                        Linhas separadas por divide-y, sem outro
                                        cartão dentro.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ul className="flex flex-col divide-y divide-border text-sm">
                                        <li className="flex items-center justify-between gap-3 py-3 first:pt-0">
                                            <span className="font-medium">
                                                Senha
                                            </span>
                                            <Badge variant="success">
                                                Vinculado
                                            </Badge>
                                        </li>
                                        <li className="flex items-center justify-between gap-3 py-3 last:pb-0">
                                            <span className="font-medium">
                                                Google
                                            </span>
                                            <span className="text-muted-foreground text-xs">
                                                Não vinculado
                                            </span>
                                        </li>
                                    </ul>
                                </CardContent>
                            </Card>
                        </div>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Rótulo acima do campo, erro abaixo, gap-2 dentro do bloco."
                        id="ds-fields"
                        title="Campos"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant title="Input">
                                <div className="flex w-full flex-col gap-2">
                                    <Label htmlFor="playground-input">
                                        E-mail
                                    </Label>
                                    <Input
                                        autoComplete="off"
                                        id="playground-input"
                                        name="playground-input"
                                        placeholder="pessoa@example.com"
                                        spellCheck={false}
                                        type="email"
                                    />
                                </div>
                                <Input
                                    aria-label="Campo desabilitado"
                                    disabled
                                    placeholder="Desabilitado"
                                />
                            </PlaygroundVariant>
                            <PlaygroundVariant title="Textarea">
                                <div className="flex w-full flex-col gap-2">
                                    <Label htmlFor="playground-textarea">
                                        Mensagem
                                    </Label>
                                    <Textarea
                                        id="playground-textarea"
                                        name="playground-textarea"
                                    />
                                </div>
                            </PlaygroundVariant>
                            <PlaygroundVariant title="InputGroup">
                                <InputGroup>
                                    <InputGroupAddon align="inline-start">
                                        <MailIcon
                                            aria-hidden
                                            className="size-4"
                                        />
                                    </InputGroupAddon>
                                    <InputGroupInput
                                        aria-label="E-mail para convite"
                                        placeholder="pessoa@example.com"
                                    />
                                    <InputGroupAddon align="inline-end">
                                        <InputGroupButton>
                                            Enviar
                                        </InputGroupButton>
                                    </InputGroupAddon>
                                </InputGroup>
                                <InputGroup>
                                    <InputGroupAddon align="inline-start">
                                        <SearchIcon
                                            aria-hidden
                                            className="size-4"
                                        />
                                    </InputGroupAddon>
                                    <InputGroupInput
                                        aria-label="Buscar"
                                        placeholder="Buscar…"
                                        type="search"
                                    />
                                </InputGroup>
                            </PlaygroundVariant>
                            <PlaygroundVariant title="Checkbox">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        checked={acceptTerms}
                                        id="accept-terms"
                                        onCheckedChange={(value) =>
                                            setAcceptTerms(Boolean(value))
                                        }
                                    />
                                    <Label htmlFor="accept-terms">
                                        Aceito os termos
                                    </Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        defaultChecked
                                        disabled
                                        id="checked-disabled"
                                    />
                                    <Label htmlFor="checked-disabled">
                                        Marcado e desabilitado
                                    </Label>
                                </div>
                            </PlaygroundVariant>
                            <PlaygroundVariant title="Switch">
                                <Switch
                                    checked={notificationsEnabled}
                                    label="Notificações"
                                    onCheckedChange={setNotificationsEnabled}
                                />
                                <Switch
                                    defaultChecked
                                    label="Pequeno"
                                    size="sm"
                                />
                                <Switch disabled label="Desabilitado" />
                            </PlaygroundVariant>
                            <PlaygroundVariant title="RadioGroup">
                                <RadioGroup
                                    aria-label="Plano"
                                    onValueChange={setSelectedPlan}
                                    value={selectedPlan}
                                >
                                    <div className="flex items-center gap-2">
                                        <RadioGroupItem
                                            id="plan-starter"
                                            value="starter"
                                        />
                                        <Label htmlFor="plan-starter">
                                            Inicial
                                        </Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <RadioGroupItem
                                            id="plan-pro"
                                            value="pro"
                                        />
                                        <Label htmlFor="plan-pro">Pro</Label>
                                    </div>
                                </RadioGroup>
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="HTML semântico: nome em font-medium, secundário em muted, status em Badge tonal, número alinhado à direita."
                        id="ds-table"
                        title="Table"
                    >
                        <Table<SampleMember>
                            columns={sampleColumns}
                            dataSource={sampleMembers}
                            onRefresh={noop}
                            pagination={false}
                            searchFields={["name", "email"]}
                        />
                        <div className="grid gap-4 lg:grid-cols-2">
                            <div className="flex flex-col gap-2">
                                <p className="font-medium text-muted-foreground text-xs">
                                    Carregando
                                </p>
                                <Table<SampleMember>
                                    columns={sampleColumns}
                                    dataSource={[]}
                                    loading
                                    pagination={false}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <p className="font-medium text-muted-foreground text-xs">
                                    Vazio
                                </p>
                                <Table<SampleMember>
                                    columns={sampleColumns}
                                    dataSource={[]}
                                    locale={{
                                        emptyText:
                                            "Nenhum membro ainda. Convide a primeira pessoa.",
                                    }}
                                    pagination={false}
                                />
                            </div>
                        </div>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Toast via useAlert (Sonner), alerta em linha, progresso, esqueleto e estado vazio."
                        id="ds-feedback"
                        title="Feedback"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant title="Toast">
                                <Button
                                    onClick={() =>
                                        successAlert("Alterações salvas.")
                                    }
                                    size="sm"
                                    type="button"
                                    variant="outline"
                                >
                                    Sucesso
                                </Button>
                                <Button
                                    onClick={() =>
                                        infoAlert("Convite reenviado.")
                                    }
                                    size="sm"
                                    type="button"
                                    variant="outline"
                                >
                                    Informação
                                </Button>
                                <Button
                                    onClick={() =>
                                        warningAlert("O convite expira amanhã.")
                                    }
                                    size="sm"
                                    type="button"
                                    variant="outline"
                                >
                                    Atenção
                                </Button>
                                <Button
                                    onClick={() =>
                                        errorAlert(
                                            "Não foi possível salvar. Tente de novo."
                                        )
                                    }
                                    size="sm"
                                    type="button"
                                    variant="outline"
                                >
                                    Erro
                                </Button>
                            </PlaygroundVariant>
                            <PlaygroundVariant
                                className="xl:col-span-2"
                                title="Alert"
                            >
                                <Alert>
                                    <BellIcon />
                                    <AlertTitle>
                                        Pagamento em análise
                                    </AlertTitle>
                                    <AlertDescription>
                                        A assinatura aparece aqui assim que o
                                        pagamento for confirmado.
                                    </AlertDescription>
                                </Alert>
                                <Alert variant="destructive">
                                    <CreditCardIcon />
                                    <AlertTitle>Pagamento recusado</AlertTitle>
                                    <AlertDescription>
                                        Atualize o cartão para manter a
                                        assinatura.
                                    </AlertDescription>
                                </Alert>
                            </PlaygroundVariant>
                            <PlaygroundVariant title="Progress">
                                <div className="grid w-full gap-3">
                                    <Progress
                                        aria-label="Envio em 20%"
                                        value={20}
                                    />
                                    <Progress
                                        aria-label="Envio em 66%"
                                        value={66}
                                    />
                                </div>
                            </PlaygroundVariant>
                            <PlaygroundVariant title="Skeleton e Spinner">
                                <div className="flex w-full items-center gap-3">
                                    <Skeleton className="size-10 rounded-full" />
                                    <div className="flex flex-1 flex-col gap-2">
                                        <Skeleton className="h-4 w-1/2" />
                                        <Skeleton className="h-4 w-2/3" />
                                    </div>
                                    <Spinner className="size-5" />
                                </div>
                            </PlaygroundVariant>
                            <PlaygroundVariant title="Empty">
                                <Empty className="w-full p-4 md:p-6">
                                    <EmptyHeader>
                                        <EmptyMedia variant="icon">
                                            <BoxIcon />
                                        </EmptyMedia>
                                        <EmptyTitle>Nenhum registro</EmptyTitle>
                                        <EmptyDescription>
                                            Crie o primeiro registro para vê-lo
                                            aqui.
                                        </EmptyDescription>
                                    </EmptyHeader>
                                    <EmptyContent>
                                        <Button size="sm" type="button">
                                            Criar registro
                                        </Button>
                                    </EmptyContent>
                                </Empty>
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Menus e dicas nascem do gatilho."
                        id="ds-overlays"
                        title="Sobreposições"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant title="Tooltip">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                            >
                                                Passe o mouse
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            Conteúdo da dica
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </PlaygroundVariant>
                            <PlaygroundVariant title="ActionsMenu">
                                <ActionsMenu
                                    items={[
                                        {
                                            icon: (
                                                <CheckIcon
                                                    aria-hidden
                                                    className="size-4"
                                                />
                                            ),
                                            key: "approve",
                                            label: "Aprovar",
                                        },
                                    ]}
                                    onDelete={noop}
                                    onEdit={noop}
                                />
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Abas, acordeão e conteúdo recolhível."
                        id="ds-disclosure"
                        title="Abas e expansão"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant
                                className="md:col-span-2 xl:col-span-3"
                                title="Tabs"
                            >
                                <Tabs
                                    className="w-full"
                                    defaultValue="overview"
                                >
                                    <TabsList>
                                        <TabsTrigger value="overview">
                                            Visão geral
                                        </TabsTrigger>
                                        <TabsTrigger value="details">
                                            Detalhes
                                        </TabsTrigger>
                                        <TabsTrigger value="billing">
                                            Cobrança
                                        </TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="overview">
                                        <p className="text-sm">
                                            Conteúdo da visão geral.
                                        </p>
                                    </TabsContent>
                                    <TabsContent value="details">
                                        <p className="text-sm">
                                            Conteúdo dos detalhes.
                                        </p>
                                    </TabsContent>
                                    <TabsContent value="billing">
                                        <p className="text-sm">
                                            Conteúdo da cobrança.
                                        </p>
                                    </TabsContent>
                                </Tabs>
                            </PlaygroundVariant>
                            <PlaygroundVariant
                                className="md:col-span-2"
                                title="Accordion"
                            >
                                <Accordion
                                    className="w-full"
                                    collapsible
                                    type="single"
                                >
                                    <AccordionItem value="item-1">
                                        <AccordionTrigger>
                                            O que é isto?
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            Um acordeão de exemplo.
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="item-2">
                                        <AccordionTrigger>
                                            Dá para personalizar?
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            Sim, cada item é independente.
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </PlaygroundVariant>
                            <PlaygroundVariant title="Collapsible">
                                <Collapsible className="w-full">
                                    <CollapsibleTrigger asChild>
                                        <Button type="button" variant="outline">
                                            Mostrar mais
                                        </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="pt-3 text-sm">
                                        Conteúdo recolhível de exemplo.
                                    </CollapsibleContent>
                                </Collapsible>
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Atalho de teclado, avatar, grupo de botões e alternância."
                        id="ds-misc"
                        title="Outros"
                    >
                        <PlaygroundVariants>
                            <PlaygroundVariant title="Kbd">
                                <KbdGroup>
                                    <Kbd>⌘</Kbd>
                                    <Kbd>K</Kbd>
                                </KbdGroup>
                                <KbdGroup>
                                    <Kbd>Shift</Kbd>
                                    <Kbd>Enter</Kbd>
                                </KbdGroup>
                            </PlaygroundVariant>
                            <PlaygroundVariant title="Avatar">
                                <Avatar>
                                    <AvatarImage alt="" src={SAMPLE_AVATAR} />
                                    <AvatarFallback>PA</AvatarFallback>
                                </Avatar>
                                <Avatar>
                                    <AvatarFallback>PB</AvatarFallback>
                                </Avatar>
                            </PlaygroundVariant>
                            <PlaygroundVariant title="ButtonGroup">
                                <ButtonGroup>
                                    <Button
                                        size="sm"
                                        type="button"
                                        variant="outline"
                                    >
                                        Anterior
                                    </Button>
                                    <ButtonGroupSeparator />
                                    <ButtonGroupText>Página 1</ButtonGroupText>
                                    <ButtonGroupSeparator />
                                    <Button
                                        size="sm"
                                        type="button"
                                        variant="outline"
                                    >
                                        Próxima
                                    </Button>
                                </ButtonGroup>
                            </PlaygroundVariant>
                            <PlaygroundVariant title="Toggle">
                                <Toggle aria-label="Negrito">Padrão</Toggle>
                                <Toggle aria-label="Itálico" variant="outline">
                                    Contorno
                                </Toggle>
                                <Toggle
                                    aria-label="Pequeno"
                                    size="sm"
                                    variant="outline"
                                >
                                    Pequeno
                                </Toggle>
                            </PlaygroundVariant>
                        </PlaygroundVariants>
                    </PlaygroundSection>

                    <PlaygroundSection
                        description="Exports de packages/design-system/components/ui."
                        id="ds-catalog"
                        title="Catálogo"
                    >
                        <ul className="flex flex-wrap gap-2">
                            {designSystemComponents.map((componentName) => (
                                <li key={componentName}>
                                    <Badge
                                        className="font-mono"
                                        variant="outline"
                                    >
                                        {componentName}
                                    </Badge>
                                </li>
                            ))}
                        </ul>
                    </PlaygroundSection>
                </div>
            </Container>
            <ScrollToTopButton />
        </>
    );
}
