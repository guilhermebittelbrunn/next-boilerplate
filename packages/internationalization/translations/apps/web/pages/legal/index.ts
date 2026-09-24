type LegalSection = { title: string; body: string };
type LegalDoc = {
    meta: { title: string; description: string };
    heading: string;
    disclaimer: string;
    sections: LegalSection[];
};
type LegalContact = {
    title: string;
    description: string;
    /** Shown when the fork publishes no address and the channel falls back to the form. */
    formLabel: string;
};
type LegalCopy = {
    sectionTitle: string;
    sectionDescription: string;
    contact: LegalContact;
    privacy: LegalDoc;
    terms: LegalDoc;
};

export const legalTranslations: Record<"pt-br" | "en" | "es", LegalCopy> = {
    "pt-br": {
        sectionTitle: "Legal",
        sectionDescription:
            "Mantemos tudo em conformidade com os requisitos legais.",
        contact: {
            title: "Canal de privacidade",
            description:
                "Fale com a gente para exercer os seus direitos ou tirar dúvidas sobre esta política.",
            formLabel: "Formulário de contato",
        },
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
                    title: "Cookies que usamos",
                    body: "Gravamos apenas cookies necessários ao funcionamento: access-token mantém a sua sessão; bp:cookie-consent guarda a sua própria escolha de consentimento por 180 dias; x-theme e x-locale lembram o tema e o idioma; sidebar_state lembra se a barra lateral fica aberta; bp:panel-request-role e bp:impersonate-firebase-uid registram em qual painel você está. Os cookies de medição do Google Analytics (_ga e variantes) só existem quando o produto tem medição configurada e você aceita no aviso de cookies. Não usamos cookies de publicidade.",
                },
                {
                    title: "Seus direitos",
                    body: "Você pode acessar, corrigir, exportar e excluir os seus dados. Baixar uma cópia e apagar a conta ficam disponíveis a qualquer momento dentro do produto, em Minha conta, aba Privacidade. Para os demais pedidos, use o canal de privacidade abaixo: respondemos em até 15 dias.",
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
        contact: {
            title: "Privacy channel",
            description:
                "Reach us to exercise your rights or to ask about this policy.",
            formLabel: "Contact form",
        },
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
                    title: "Cookies we use",
                    body: "We only store the cookies the product needs to work: access-token keeps you signed in; bp:cookie-consent stores your own consent choice for 180 days; x-theme and x-locale remember your theme and language; sidebar_state remembers whether the sidebar stays open; bp:panel-request-role and bp:impersonate-firebase-uid record which panel you are in. Google Analytics measurement cookies (_ga and variants) only exist when the product has measurement configured and you accept them in the cookie notice. We use no advertising cookies.",
                },
                {
                    title: "Your rights",
                    body: "You can access, correct, export and delete your data. Downloading a copy and deleting your account are available at any time inside the product, under My account, Privacy tab. For anything else, use the privacy channel below: we answer within 15 days.",
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
        contact: {
            title: "Canal de privacidad",
            description:
                "Escríbenos para ejercer tus derechos o resolver dudas sobre esta política.",
            formLabel: "Formulario de contacto",
        },
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
                    title: "Cookies que usamos",
                    body: "Solo guardamos las cookies necesarias para el funcionamiento: access-token mantiene tu sesión; bp:cookie-consent guarda tu propia elección de consentimiento durante 180 días; x-theme y x-locale recuerdan el tema y el idioma; sidebar_state recuerda si la barra lateral queda abierta; bp:panel-request-role y bp:impersonate-firebase-uid registran en qué panel estás. Las cookies de medición de Google Analytics (_ga y variantes) solo existen cuando el producto tiene la medición configurada y las aceptas en el aviso de cookies. No usamos cookies de publicidad.",
                },
                {
                    title: "Tus derechos",
                    body: "Puedes acceder, corregir, exportar y eliminar tus datos. Descargar una copia y borrar la cuenta están disponibles en cualquier momento dentro del producto, en Mi cuenta, pestaña Privacidad. Para el resto de solicitudes, usa el canal de privacidad de abajo: respondemos en un plazo de 15 días.",
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
