export const adminHomePageTranslations = {
    "pt-br": {
        greeting: "Olá",
        subtitle: "Um resumo da base de usuários.",
        metrics: {
            total: {
                label: "Usuários",
                hint: "Perfis cadastrados na plataforma.",
            },
            admins: {
                label: "Administradores",
                hint: "Perfis com acesso ao painel admin.",
            },
            common: {
                label: "Usuários comuns",
                hint: "Perfis que operam o painel comum.",
            },
        },
        activity: {
            title: "Atividade",
            description: "Quem acessou o painel e há quanto tempo.",
            metrics: {
                active: {
                    label: "Ativos",
                    hint: "Acessaram nos últimos {days} dias. O registro tem precisão de {minutes} minutos.",
                },
                inactive: {
                    label: "Inativos",
                    hint: "Sem acesso há mais de {days} dias. Não inclui quem nunca acessou.",
                },
            },
            chart: {
                title: "Último acesso por faixa",
                description:
                    "Dias desde o último acesso. Cada perfil aparece em uma faixa só, a do acesso mais recente dele.",
            },
            buckets: {
                last7Days: "0-7d",
                from8To30Days: "8-30d",
                from31To90Days: "31-90d",
                over90Days: "+90d",
                never: "Nunca",
            },
            neverNotice:
                "{count} perfis ainda não têm registro de acesso. O registro de cada pessoa começa no próximo acesso dela.",
        },
        billing: {
            title: "Cobrança",
            description:
                "Assinaturas e pagamentos registrados pelo webhook da Stripe.",
            empty: {
                title: "Nenhuma assinatura ainda",
                description:
                    "Quando a primeira assinatura for paga, as contratações, os planos e o valor recebido aparecem aqui. Os números contam a partir do momento em que o webhook passou a receber o evento invoice.paid; vendas anteriores não entram.",
            },
            missingInvoiceEvent:
                "Há assinaturas vigentes, mas nenhuma fatura paga foi registrada. Confira se o evento invoice.paid está cadastrado no endpoint do webhook da Stripe.",
            revenue: {
                title: "Recebido em {month}",
                criteria:
                    "Faturas pagas no mês, fechado em UTC. Não desconta reembolsos e não substitui a contabilidade.",
                trackingSince: "Contando desde {date}.",
                multiCurrency:
                    "Valores em moedas diferentes aparecem separados, sem conversão.",
                none: "Nenhuma fatura paga neste mês.",
            },
            plans: {
                title: "Planos mais vendidos",
                description:
                    "Assinaturas vigentes por plano, incluindo as com pagamento pendente.",
                empty: "Nenhuma assinatura vigente.",
                other: "Resto",
                unnamed: "Plano sem nome",
                interval: {
                    day: "diário",
                    week: "semanal",
                    month: "mensal",
                    year: "anual",
                },
                everyInterval: "a cada {count} {unit}",
                intervalUnits: {
                    day: "dias",
                    week: "semanas",
                    month: "meses",
                    year: "anos",
                },
            },
            activations: {
                title: "Contratações recentes",
                description:
                    "Pela data da primeira cobrança paga. Datas em UTC.",
                empty: "Nenhuma contratação registrada ainda.",
                removedUser: "Usuário removido",
            },
        },
    },
    en: {
        greeting: "Hello",
        subtitle: "A summary of the user base.",
        metrics: {
            total: {
                label: "Users",
                hint: "Profiles registered on the platform.",
            },
            admins: {
                label: "Admins",
                hint: "Profiles with access to the admin panel.",
            },
            common: {
                label: "Common users",
                hint: "Profiles that operate the common panel.",
            },
        },
        activity: {
            title: "Activity",
            description: "Who signed in to the panel, and how long ago.",
            metrics: {
                active: {
                    label: "Active",
                    hint: "Signed in over the last {days} days. The record is accurate to {minutes} minutes.",
                },
                inactive: {
                    label: "Inactive",
                    hint: "No sign-in for more than {days} days. Leaves out anyone who never signed in.",
                },
            },
            chart: {
                title: "Last sign-in by range",
                description:
                    "Days since the last sign-in. Each profile shows up in a single range, the one of its most recent sign-in.",
            },
            buckets: {
                last7Days: "0-7d",
                from8To30Days: "8-30d",
                from31To90Days: "31-90d",
                over90Days: "+90d",
                never: "Never",
            },
            neverNotice:
                "{count} profiles have no sign-in record yet. Each person's record starts on their next sign-in.",
        },
        billing: {
            title: "Billing",
            description:
                "Subscriptions and payments recorded by the Stripe webhook.",
            empty: {
                title: "No subscriptions yet",
                description:
                    "Once the first subscription is paid, new subscriptions, plans and the amount received show up here. The numbers count from the moment the webhook started receiving the invoice.paid event; earlier sales are not included.",
            },
            missingInvoiceEvent:
                "There are live subscriptions, but no paid invoice has been recorded. Check that the invoice.paid event is registered on the Stripe webhook endpoint.",
            revenue: {
                title: "Received in {month}",
                criteria:
                    "Invoices paid in the month, closed in UTC. Refunds are not deducted, and this does not replace your accounting.",
                trackingSince: "Counting since {date}.",
                multiCurrency:
                    "Amounts in different currencies are shown separately, without conversion.",
                none: "No invoice paid this month.",
            },
            plans: {
                title: "Top plans",
                description:
                    "Live subscriptions per plan, including those with a pending payment.",
                empty: "No live subscriptions.",
                other: "Other",
                unnamed: "Unnamed plan",
                interval: {
                    day: "daily",
                    week: "weekly",
                    month: "monthly",
                    year: "yearly",
                },
                everyInterval: "every {count} {unit}",
                intervalUnits: {
                    day: "days",
                    week: "weeks",
                    month: "months",
                    year: "years",
                },
            },
            activations: {
                title: "Recent subscriptions",
                description:
                    "By the date of the first paid invoice. Dates in UTC.",
                empty: "No subscriptions recorded yet.",
                removedUser: "Removed user",
            },
        },
    },
    es: {
        greeting: "Hola",
        subtitle: "Un resumen de la base de usuarios.",
        metrics: {
            total: {
                label: "Usuarios",
                hint: "Perfiles registrados en la plataforma.",
            },
            admins: {
                label: "Administradores",
                hint: "Perfiles con acceso al panel de administración.",
            },
            common: {
                label: "Usuarios comunes",
                hint: "Perfiles que operan el panel común.",
            },
        },
        activity: {
            title: "Actividad",
            description: "Quién accedió al panel y hace cuánto tiempo.",
            metrics: {
                active: {
                    label: "Activos",
                    hint: "Accedieron en los últimos {days} días. El registro tiene una precisión de {minutes} minutos.",
                },
                inactive: {
                    label: "Inactivos",
                    hint: "Sin acceso desde hace más de {days} días. No incluye a quienes nunca accedieron.",
                },
            },
            chart: {
                title: "Último acceso por franja",
                description:
                    "Días desde el último acceso. Cada perfil aparece en una sola franja, la de su acceso más reciente.",
            },
            buckets: {
                last7Days: "0-7d",
                from8To30Days: "8-30d",
                from31To90Days: "31-90d",
                over90Days: "+90d",
                never: "Nunca",
            },
            neverNotice:
                "{count} perfiles todavía no tienen registro de acceso. El registro de cada persona empieza en su próximo acceso.",
        },
        billing: {
            title: "Cobros",
            description:
                "Suscripciones y pagos registrados por el webhook de Stripe.",
            empty: {
                title: "Todavía no hay suscripciones",
                description:
                    "Cuando se pague la primera suscripción, las contrataciones, los planes y el importe recibido aparecerán aquí. Los números cuentan desde el momento en que el webhook empezó a recibir el evento invoice.paid; las ventas anteriores no se incluyen.",
            },
            missingInvoiceEvent:
                "Hay suscripciones vigentes, pero no se ha registrado ninguna factura pagada. Comprueba que el evento invoice.paid esté registrado en el endpoint del webhook de Stripe.",
            revenue: {
                title: "Recibido en {month}",
                criteria:
                    "Facturas pagadas en el mes, cerrado en UTC. No descuenta reembolsos y no sustituye a la contabilidad.",
                trackingSince: "Contando desde {date}.",
                multiCurrency:
                    "Los importes en monedas distintas aparecen por separado, sin conversión.",
                none: "Ninguna factura pagada este mes.",
            },
            plans: {
                title: "Planes más vendidos",
                description:
                    "Suscripciones vigentes por plan, incluidas las que tienen un pago pendiente.",
                empty: "Ninguna suscripción vigente.",
                other: "Otros",
                unnamed: "Plan sin nombre",
                interval: {
                    day: "diario",
                    week: "semanal",
                    month: "mensual",
                    year: "anual",
                },
                everyInterval: "cada {count} {unit}",
                intervalUnits: {
                    day: "días",
                    week: "semanas",
                    month: "meses",
                    year: "años",
                },
            },
            activations: {
                title: "Contrataciones recientes",
                description:
                    "Por la fecha del primer cobro pagado. Fechas en UTC.",
                empty: "Todavía no hay contrataciones registradas.",
                removedUser: "Usuario eliminado",
            },
        },
    },
};
