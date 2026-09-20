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
    },
};
