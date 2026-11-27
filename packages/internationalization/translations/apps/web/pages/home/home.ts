export const homeTranslations = {
    "pt-br": {
        meta: {
            title: "Monorepo Next.js para quem lança MVPs em série",
            description:
                "Cada produto nasce como fork e já sai com login, painel, área admin, assinaturas Stripe, e-mails e três idiomas funcionando.",
        },
        hero: {
            description:
                "Troque marca, domínio e credenciais. Login, painel, área admin, assinaturas Stripe, e-mails e três idiomas já vêm prontos e cobertos por testes.",
            fact: "Roda offline com os emuladores do Firebase: nenhuma conta de serviço para começar.",
            preview: {
                caption: "Painel de exemplo com dados ilustrativos.",
                nav: ["Início", "Entidades", "Equipe", "Conta", "Admin"],
                title: "Entidades",
                newItem: "Nova entidade",
                columns: {
                    name: "Nome",
                    type: "Tipo",
                    status: "Situação",
                },
                rows: [
                    {
                        name: "Entidade 1",
                        type: "Franquia",
                        status: "Ativa",
                    },
                    {
                        name: "Entidade 2",
                        type: "Cliente",
                        status: "Ativa",
                    },
                    {
                        name: "Entidade 3",
                        type: "Colaborador",
                        status: "Ativa",
                    },
                    {
                        name: "Entidade 4",
                        type: "Cliente",
                        status: "Inativa",
                    },
                ],
                terminalReady: "pronto",
            },
        },
        steps: {
            title: "Do fork ao primeiro recurso do seu produto",
            description:
                "O que muda de um MVP para outro é a marca e o domínio. O resto já está no lugar.",
            items: [
                {
                    title: "Faça o fork e troque a marca",
                    description:
                        "Nome, logo e e-mail de suporte vêm de variáveis de ambiente. As cores ficam num único arquivo de tokens.",
                    code: "NEXT_PUBLIC_APP_NAME",
                },
                {
                    title: "Suba tudo com um comando",
                    description:
                        "O painel, a landing, a API e o preview de e-mails sobem juntos. Os emuladores e o seed dispensam conta em qualquer serviço.",
                    code: "pnpm dev",
                },
                {
                    title: "Escreva só o que é do seu produto",
                    description:
                        "O CRUD de exemplo cobre o caminho inteiro: SDK, API, painel e traduções. Cada recurso novo segue o mesmo molde.",
                    code: "/new-crud",
                },
            ],
        },
        inherits: {
            title: "O que cada fork herda no primeiro dia",
            description:
                "Funcionalidades implementadas e testadas no core. As opcionais ficam desligadas até você preencher a variável de ambiente.",
            optional: "Opcional",
            account: {
                title: "Entrada e conta",
                description:
                    "A pessoa cria a conta, entra e cuida dos próprios dados sem você escrever uma tela.",
                items: [
                    "E-mail e senha, Google e link por e-mail",
                    "Verificação de e-mail e recuperação de senha",
                    "Sessões ativas, com encerramento por sessão",
                    "Exportar os dados e excluir a conta (LGPD)",
                ],
            },
            admin: {
                title: "Área admin",
                description:
                    "Métricas de usuários, gestão de contas, trilha de auditoria e impersonação em modo leitura para ver o painel como o usuário vê.",
            },
            billing: {
                title: "Assinaturas Stripe",
                description:
                    "Planos, checkout, portal do cliente e webhooks. A página de preços se monta a partir do catálogo da Stripe.",
            },
            languages: {
                title: "Três idiomas desde o primeiro commit",
                description:
                    "Todo texto da interface passa pelo dicionário em português, inglês e espanhol. Se faltar uma chave em um idioma, o teste reprova a build.",
                sample: [
                    { locale: "pt-br", text: "Salvar alterações" },
                    { locale: "en", text: "Save changes" },
                    { locale: "es", text: "Guardar cambios" },
                ],
            },
        },
        quality: {
            title: "O CI roda a mesma linha que você roda no terminal",
            description:
                "Se passa na sua máquina, passa no GitHub Actions. A suíte de ponta a ponta roda à parte, em toda PR que mexe em produto.",
            command: "pnpm turbo run lint typecheck test test:emulator",
            gates: [
                {
                    name: "lint",
                    description: "Biome no repositório inteiro",
                },
                {
                    name: "typecheck",
                    description: "TypeScript estrito em cada workspace",
                },
                {
                    name: "test",
                    description:
                        "Vitest, com o teste de paridade dos três idiomas",
                },
                {
                    name: "test:emulator",
                    description:
                        "Regras do Firestore e do Storage testadas no emulador",
                },
                {
                    name: "e2e",
                    description:
                        "Playwright nos fluxos críticos, com verificação de acessibilidade no tema claro e no escuro",
                },
            ],
        },
    },
    en: {
        meta: {
            title: "Next.js monorepo for teams that ship MVP after MVP",
            description:
                "Every product starts as a fork and ships with sign-in, a user panel, an admin area, Stripe subscriptions, emails and three languages already working.",
        },
        hero: {
            description:
                "Swap the brand, domain and credentials. Sign-in, user panel, admin area, Stripe subscriptions, emails and three languages come ready and covered by tests.",
            fact: "Runs offline on the Firebase emulators: no service account needed to start.",
            preview: {
                caption: "Sample panel with illustrative data.",
                nav: ["Home", "Entities", "Team", "Account", "Admin"],
                title: "Entities",
                newItem: "New entity",
                columns: {
                    name: "Name",
                    type: "Type",
                    status: "Status",
                },
                rows: [
                    {
                        name: "Entity 1",
                        type: "Franchise",
                        status: "Active",
                    },
                    {
                        name: "Entity 2",
                        type: "Customer",
                        status: "Active",
                    },
                    {
                        name: "Entity 3",
                        type: "Collaborator",
                        status: "Active",
                    },
                    {
                        name: "Entity 4",
                        type: "Customer",
                        status: "Inactive",
                    },
                ],
                terminalReady: "ready",
            },
        },
        steps: {
            title: "From fork to your product's first feature",
            description:
                "What changes from one MVP to the next is the brand and the domain. Everything else is already in place.",
            items: [
                {
                    title: "Fork it and swap the brand",
                    description:
                        "Name, logo and support email come from environment variables. Colours live in a single tokens file.",
                    code: "NEXT_PUBLIC_APP_NAME",
                },
                {
                    title: "Start everything with one command",
                    description:
                        "The panel, the landing page, the API and the email preview start together. The emulators and the seed mean no account on any service.",
                    code: "pnpm dev",
                },
                {
                    title: "Write only what belongs to your product",
                    description:
                        "The sample CRUD covers the whole path: SDK, API, panel and translations. Every new feature follows the same mould.",
                    code: "/new-crud",
                },
            ],
        },
        inherits: {
            title: "What every fork inherits on day one",
            description:
                "Features built and tested in the core. Optional ones stay off until you fill in their environment variable.",
            optional: "Optional",
            account: {
                title: "Sign-in and account",
                description:
                    "People create an account, sign in and manage their own data without you writing a single screen.",
                items: [
                    "Email and password, Google and email link",
                    "Email verification and password recovery",
                    "Active sessions, each one revocable",
                    "Data export and account deletion (GDPR)",
                ],
            },
            admin: {
                title: "Admin area",
                description:
                    "User metrics, account management, an audit trail and read-only impersonation to see the panel the way the user does.",
            },
            billing: {
                title: "Stripe subscriptions",
                description:
                    "Plans, checkout, customer portal and webhooks. The pricing page builds itself from the Stripe catalog.",
            },
            languages: {
                title: "Three languages from the first commit",
                description:
                    "Every interface string goes through the dictionary in Portuguese, English and Spanish. If a key is missing in one language, the test fails the build.",
                sample: [
                    { locale: "pt-br", text: "Salvar alterações" },
                    { locale: "en", text: "Save changes" },
                    { locale: "es", text: "Guardar cambios" },
                ],
            },
        },
        quality: {
            title: "CI runs the same line you run in your terminal",
            description:
                "If it passes on your machine, it passes on GitHub Actions. The end-to-end suite runs separately, on every PR that touches the product.",
            command: "pnpm turbo run lint typecheck test test:emulator",
            gates: [
                {
                    name: "lint",
                    description: "Biome across the whole repository",
                },
                {
                    name: "typecheck",
                    description: "Strict TypeScript in every workspace",
                },
                {
                    name: "test",
                    description:
                        "Vitest, including the three-language parity test",
                },
                {
                    name: "test:emulator",
                    description:
                        "Firestore and Storage rules tested on the emulator",
                },
                {
                    name: "e2e",
                    description:
                        "Playwright on the critical flows, with accessibility checks in light and dark themes",
                },
            ],
        },
    },
    es: {
        meta: {
            title: "Monorepo Next.js para quien lanza MVPs en serie",
            description:
                "Cada producto nace como fork y ya sale con inicio de sesión, panel, área de administración, suscripciones Stripe, correos y tres idiomas funcionando.",
        },
        hero: {
            description:
                "Cambia la marca, el dominio y las credenciales. Inicio de sesión, panel, área de administración, suscripciones Stripe, correos y tres idiomas vienen listos y cubiertos por pruebas.",
            fact: "Funciona sin conexión con los emuladores de Firebase: ninguna cuenta de servicio para empezar.",
            preview: {
                caption: "Panel de ejemplo con datos ilustrativos.",
                nav: ["Inicio", "Entidades", "Equipo", "Cuenta", "Admin"],
                title: "Entidades",
                newItem: "Nueva entidad",
                columns: {
                    name: "Nombre",
                    type: "Tipo",
                    status: "Estado",
                },
                rows: [
                    {
                        name: "Entidad 1",
                        type: "Franquicia",
                        status: "Activa",
                    },
                    {
                        name: "Entidad 2",
                        type: "Cliente",
                        status: "Activa",
                    },
                    {
                        name: "Entidad 3",
                        type: "Colaborador",
                        status: "Activa",
                    },
                    {
                        name: "Entidad 4",
                        type: "Cliente",
                        status: "Inactiva",
                    },
                ],
                terminalReady: "listo",
            },
        },
        steps: {
            title: "Del fork a la primera función de tu producto",
            description:
                "Lo que cambia de un MVP a otro es la marca y el dominio. Lo demás ya está en su lugar.",
            items: [
                {
                    title: "Haz el fork y cambia la marca",
                    description:
                        "Nombre, logo y correo de soporte vienen de variables de entorno. Los colores están en un único archivo de tokens.",
                    code: "NEXT_PUBLIC_APP_NAME",
                },
                {
                    title: "Levanta todo con un comando",
                    description:
                        "El panel, la landing, la API y la vista previa de correos arrancan juntos. Los emuladores y el seed evitan crear cuentas en cualquier servicio.",
                    code: "pnpm dev",
                },
                {
                    title: "Escribe solo lo que es de tu producto",
                    description:
                        "El CRUD de ejemplo cubre todo el camino: SDK, API, panel y traducciones. Cada función nueva sigue el mismo molde.",
                    code: "/new-crud",
                },
            ],
        },
        inherits: {
            title: "Lo que cada fork hereda el primer día",
            description:
                "Funciones implementadas y probadas en el core. Las opcionales quedan apagadas hasta que completes su variable de entorno.",
            optional: "Opcional",
            account: {
                title: "Acceso y cuenta",
                description:
                    "La persona crea su cuenta, inicia sesión y gestiona sus datos sin que escribas una sola pantalla.",
                items: [
                    "Correo y contraseña, Google y enlace por correo",
                    "Verificación de correo y recuperación de contraseña",
                    "Sesiones activas, cada una revocable",
                    "Exportar los datos y eliminar la cuenta (RGPD)",
                ],
            },
            admin: {
                title: "Área de administración",
                description:
                    "Métricas de usuarios, gestión de cuentas, registro de auditoría y suplantación en modo lectura para ver el panel como lo ve el usuario.",
            },
            billing: {
                title: "Suscripciones Stripe",
                description:
                    "Planes, checkout, portal del cliente y webhooks. La página de precios se arma a partir del catálogo de Stripe.",
            },
            languages: {
                title: "Tres idiomas desde el primer commit",
                description:
                    "Todo texto de la interfaz pasa por el diccionario en portugués, inglés y español. Si falta una clave en un idioma, la prueba reprueba el build.",
                sample: [
                    { locale: "pt-br", text: "Salvar alterações" },
                    { locale: "en", text: "Save changes" },
                    { locale: "es", text: "Guardar cambios" },
                ],
            },
        },
        quality: {
            title: "El CI ejecuta la misma línea que ejecutas en tu terminal",
            description:
                "Si pasa en tu máquina, pasa en GitHub Actions. La suite de extremo a extremo corre aparte, en cada PR que toca el producto.",
            command: "pnpm turbo run lint typecheck test test:emulator",
            gates: [
                {
                    name: "lint",
                    description: "Biome en todo el repositorio",
                },
                {
                    name: "typecheck",
                    description: "TypeScript estricto en cada workspace",
                },
                {
                    name: "test",
                    description:
                        "Vitest, con la prueba de paridad de los tres idiomas",
                },
                {
                    name: "test:emulator",
                    description:
                        "Reglas de Firestore y Storage probadas en el emulador",
                },
                {
                    name: "e2e",
                    description:
                        "Playwright en los flujos críticos, con verificación de accesibilidad en tema claro y oscuro",
                },
            ],
        },
    },
};
