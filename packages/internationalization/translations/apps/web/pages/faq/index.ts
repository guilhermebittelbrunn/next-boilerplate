export const faqTranslations = {
    "pt-br": {
        title: "Perguntas frequentes",
        description:
            "O que costuma pesar antes de começar um MVP a partir deste monorepo.",
        cta: "Falar com a equipe",
        items: [
            {
                question: "Preciso pagar algum serviço para começar?",
                answer: "Para desenvolver, não: o stack inteiro roda nos emuladores do Firebase, com seed. Em produção, Vercel, Firebase e Resend têm planos gratuitos para começar, e a Stripe cobra por transação.",
            },
            {
                question: "O que muda num fork?",
                answer: "Nome, logo e e-mail de suporte vêm de variáveis de ambiente, e as cores ficam num único arquivo de tokens. O que sobra para escrever é o domínio do seu produto.",
            },
            {
                question: "Posso lançar sem cobrança?",
                answer: "Sim. A integração com a Stripe fica desligada até as chaves serem preenchidas, e o modo de produto simples deixa a pessoa operar direto na web, sem painel de assinatura.",
            },
            {
                question: "Quais idiomas vêm prontos?",
                answer: "Português, inglês e espanhol. Todo texto da interface sai de um dicionário próprio, sem serviço de terceiros, e um teste de paridade reprova a build se faltar uma chave.",
            },
            {
                question: "Como adiciono uma funcionalidade nova?",
                answer: "Copie o padrão do CRUD de exemplo, que cobre SDK, API, painel e traduções de ponta a ponta. O comando /new-crud gera esse esqueleto para um recurso novo.",
            },
        ],
    },
    en: {
        title: "Frequently asked questions",
        description:
            "What usually weighs on the decision before starting an MVP from this monorepo.",
        cta: "Talk to the team",
        items: [
            {
                question: "Do I need to pay for any service to start?",
                answer: "Not to develop: the whole stack runs on the Firebase emulators, with a seed. In production, Vercel, Firebase and Resend have free tiers to start, and Stripe charges per transaction.",
            },
            {
                question: "What changes in a fork?",
                answer: "Name, logo and support email come from environment variables, and colours live in a single tokens file. What is left to write is your product's domain.",
            },
            {
                question: "Can I launch without billing?",
                answer: "Yes. The Stripe integration stays off until its keys are filled in, and the simple product mode lets people work straight on the web, with no subscription panel.",
            },
            {
                question: "Which languages come ready?",
                answer: "Portuguese, English and Spanish. Every interface string comes from an in-house dictionary, with no third-party service, and a parity test fails the build if a key is missing.",
            },
            {
                question: "How do I add a new feature?",
                answer: "Copy the pattern of the sample CRUD, which covers SDK, API, panel and translations end to end. The /new-crud command scaffolds that skeleton for a new resource.",
            },
        ],
    },
    es: {
        title: "Preguntas frecuentes",
        description:
            "Lo que suele pesar antes de empezar un MVP a partir de este monorepo.",
        cta: "Hablar con el equipo",
        items: [
            {
                question: "¿Tengo que pagar algún servicio para empezar?",
                answer: "Para desarrollar, no: todo el stack corre en los emuladores de Firebase, con seed. En producción, Vercel, Firebase y Resend tienen planes gratuitos para empezar, y Stripe cobra por transacción.",
            },
            {
                question: "¿Qué cambia en un fork?",
                answer: "Nombre, logo y correo de soporte vienen de variables de entorno, y los colores están en un único archivo de tokens. Lo que queda por escribir es el dominio de tu producto.",
            },
            {
                question: "¿Puedo lanzar sin cobros?",
                answer: "Sí. La integración con Stripe queda apagada hasta completar sus claves, y el modo de producto simple deja que la persona opere directo en la web, sin panel de suscripción.",
            },
            {
                question: "¿Qué idiomas vienen listos?",
                answer: "Portugués, inglés y español. Todo texto de la interfaz sale de un diccionario propio, sin servicios de terceros, y una prueba de paridad reprueba el build si falta una clave.",
            },
            {
                question: "¿Cómo agrego una función nueva?",
                answer: "Copia el patrón del CRUD de ejemplo, que cubre SDK, API, panel y traducciones de punta a punta. El comando /new-crud genera ese esqueleto para un recurso nuevo.",
            },
        ],
    },
};
