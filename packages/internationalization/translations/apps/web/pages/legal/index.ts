type LegalSection = { title: string; body: string };
type LegalDoc = {
    meta: { title: string; description: string };
    heading: string;
    disclaimer: string;
    sections: LegalSection[];
};
type LegalCopy = {
    sectionTitle: string;
    sectionDescription: string;
    privacy: LegalDoc;
    terms: LegalDoc;
};

export const legalTranslations: Record<"pt-br" | "en" | "es", LegalCopy> = {
    "pt-br": {
        sectionTitle: "Legal",
        sectionDescription:
            "Mantemos tudo em conformidade com os requisitos legais.",
        privacy: {
            meta: {
                title: "Política de Privacidade",
                description:
                    "Como coletamos, usamos e protegemos os seus dados.",
            },
            heading: "Política de Privacidade",
            disclaimer:
                "Este é um modelo do boilerplate. Substitua por sua política real antes de publicar.",
            sections: [
                {
                    title: "Dados que coletamos",
                    body: "Coletamos apenas os dados necessários para fornecer e melhorar o serviço, como informações de conta e dados de uso.",
                },
                {
                    title: "Como usamos os dados",
                    body: "Usamos os dados para operar, manter e aprimorar o produto, e para nos comunicarmos com você sobre o serviço.",
                },
                {
                    title: "Seus direitos",
                    body: "Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento entrando em contato conosco.",
                },
            ],
        },
        terms: {
            meta: {
                title: "Termos de Uso",
                description: "As regras para utilizar o nosso serviço.",
            },
            heading: "Termos de Uso",
            disclaimer:
                "Este é um modelo do boilerplate. Substitua pelos seus termos reais antes de publicar.",
            sections: [
                {
                    title: "Aceitação dos termos",
                    body: "Ao acessar ou usar o serviço, você concorda com estes termos. Se não concordar, não utilize o serviço.",
                },
                {
                    title: "Uso do serviço",
                    body: "Você concorda em usar o serviço de acordo com as leis aplicáveis e sem prejudicar terceiros.",
                },
                {
                    title: "Limitação de responsabilidade",
                    body: "O serviço é fornecido 'como está', sem garantias. Não nos responsabilizamos por danos indiretos decorrentes do uso.",
                },
            ],
        },
    },
    en: {
        sectionTitle: "Legal",
        sectionDescription: "We stay on top of the latest legal requirements.",
        privacy: {
            meta: {
                title: "Privacy Policy",
                description: "How we collect, use and protect your data.",
            },
            heading: "Privacy Policy",
            disclaimer:
                "This is a boilerplate template. Replace it with your real policy before going live.",
            sections: [
                {
                    title: "Data we collect",
                    body: "We only collect the data needed to provide and improve the service, such as account information and usage data.",
                },
                {
                    title: "How we use data",
                    body: "We use data to operate, maintain and improve the product, and to communicate with you about the service.",
                },
                {
                    title: "Your rights",
                    body: "You can request access, correction or deletion of your data at any time by contacting us.",
                },
            ],
        },
        terms: {
            meta: {
                title: "Terms of Service",
                description: "The rules for using our service.",
            },
            heading: "Terms of Service",
            disclaimer:
                "This is a boilerplate template. Replace it with your real terms before going live.",
            sections: [
                {
                    title: "Acceptance of terms",
                    body: "By accessing or using the service, you agree to these terms. If you do not agree, do not use the service.",
                },
                {
                    title: "Use of the service",
                    body: "You agree to use the service in accordance with applicable laws and without harming third parties.",
                },
                {
                    title: "Limitation of liability",
                    body: "The service is provided 'as is', without warranties. We are not liable for indirect damages arising from its use.",
                },
            ],
        },
    },
    es: {
        sectionTitle: "Legal",
        sectionDescription: "Nos mantenemos al día con los requisitos legales.",
        privacy: {
            meta: {
                title: "Política de Privacidad",
                description: "Cómo recopilamos, usamos y protegemos tus datos.",
            },
            heading: "Política de Privacidad",
            disclaimer:
                "Esta es una plantilla del boilerplate. Sustitúyela por tu política real antes de publicar.",
            sections: [
                {
                    title: "Datos que recopilamos",
                    body: "Solo recopilamos los datos necesarios para prestar y mejorar el servicio, como información de cuenta y datos de uso.",
                },
                {
                    title: "Cómo usamos los datos",
                    body: "Usamos los datos para operar, mantener y mejorar el producto, y para comunicarnos contigo sobre el servicio.",
                },
                {
                    title: "Tus derechos",
                    body: "Puedes solicitar acceso, corrección o eliminación de tus datos en cualquier momento contactándonos.",
                },
            ],
        },
        terms: {
            meta: {
                title: "Términos de Servicio",
                description: "Las reglas para usar nuestro servicio.",
            },
            heading: "Términos de Servicio",
            disclaimer:
                "Esta es una plantilla del boilerplate. Sustitúyela por tus términos reales antes de publicar.",
            sections: [
                {
                    title: "Aceptación de los términos",
                    body: "Al acceder o usar el servicio, aceptas estos términos. Si no estás de acuerdo, no uses el servicio.",
                },
                {
                    title: "Uso del servicio",
                    body: "Aceptas usar el servicio de acuerdo con las leyes aplicables y sin perjudicar a terceros.",
                },
                {
                    title: "Limitación de responsabilidad",
                    body: "El servicio se proporciona 'tal cual', sin garantías. No somos responsables de daños indirectos derivados de su uso.",
                },
            ],
        },
    },
};
