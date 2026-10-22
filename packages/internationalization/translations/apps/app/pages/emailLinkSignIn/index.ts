export const emailLinkSignInTranslations = {
    "pt-br": {
        meta: {
            title: "Entrar com link por e-mail",
            description: "Receba um link de acesso no seu e-mail",
        },
        request: {
            title: "Entrar com link por e-mail",
            description:
                "Digite o e-mail da sua conta. Enviamos um link que entra direto, sem senha.",
            form: {
                email: "Email",
                emailPlaceholder: "seu@email.com",
                submit: "Enviar link",
            },
            sent: {
                title: "Confira seu e-mail",
                description:
                    'Se existir uma conta com senha e e-mail confirmado para esse endereço, o link chega em instantes. Não chegou? Use "Esqueci minha senha" ou entre com o Google.',
            },
            unavailable: {
                title: "Entrar por link não está disponível",
                description: "Use seu e-mail e senha ou o Google para entrar.",
            },
        },
        complete: {
            signingIn: "Entrando…",
            confirm: {
                title: "Confirme seu e-mail",
                description:
                    "Por segurança, digite o e-mail que recebeu este link.",
                submit: "Entrar",
            },
            mismatch: "Este link foi pedido para outro e-mail.",
            expired: {
                title: "Este link expirou",
                description: "Peça um link novo para entrar.",
            },
            invalid: {
                title: "Este link não vale mais",
                description:
                    "Ele já foi usado ou está incompleto. Peça um link novo.",
            },
            failed: {
                title: "Não foi possível entrar",
            },
        },
        validation: {
            emailInvalid: "Email inválido",
        },
        requestAnother: "Pedir outro link",
        backToSignIn: "Voltar para o login",
    },
    en: {
        meta: {
            title: "Sign in with an email link",
            description: "Get a sign-in link in your inbox",
        },
        request: {
            title: "Sign in with an email link",
            description:
                "Enter your account email. We will send you a link that signs you in, no password needed.",
            form: {
                email: "Email",
                emailPlaceholder: "you@email.com",
                submit: "Send link",
            },
            sent: {
                title: "Check your email",
                description:
                    'If there is an account with a password and a confirmed email for that address, the link arrives shortly. Nothing yet? Use "Forgot your password?" or continue with Google.',
            },
            unavailable: {
                title: "Sign-in by email link is not available",
                description:
                    "Use your email and password or Google to sign in.",
            },
        },
        complete: {
            signingIn: "Signing you in…",
            confirm: {
                title: "Confirm your email",
                description:
                    "For your security, enter the email address that received this link.",
                submit: "Sign In",
            },
            mismatch: "This link was requested for a different email.",
            expired: {
                title: "This link has expired",
                description: "Request a new link to sign in.",
            },
            invalid: {
                title: "This link no longer works",
                description:
                    "It was already used or is incomplete. Request a new link.",
            },
            failed: {
                title: "Could not sign you in",
            },
        },
        validation: {
            emailInvalid: "Invalid email",
        },
        requestAnother: "Request another link",
        backToSignIn: "Back to sign in",
    },
    es: {
        meta: {
            title: "Iniciar sesión con un enlace por correo",
            description: "Recibe un enlace de acceso en tu correo",
        },
        request: {
            title: "Iniciar sesión con un enlace por correo",
            description:
                "Escribe el correo de tu cuenta. Te enviaremos un enlace que inicia sesión directamente, sin contraseña.",
            form: {
                email: "Email",
                emailPlaceholder: "tu@email.com",
                submit: "Enviar enlace",
            },
            sent: {
                title: "Revisa tu correo",
                description:
                    'Si existe una cuenta con contraseña y correo confirmado para esa dirección, el enlace llega en unos momentos. ¿No llegó? Usa "¿Olvidaste tu contraseña?" o continúa con Google.',
            },
            unavailable: {
                title: "El acceso por enlace no está disponible",
                description:
                    "Usa tu correo y contraseña o Google para iniciar sesión.",
            },
        },
        complete: {
            signingIn: "Iniciando sesión…",
            confirm: {
                title: "Confirma tu correo",
                description:
                    "Por seguridad, escribe el correo que recibió este enlace.",
                submit: "Iniciar sesión",
            },
            mismatch: "Este enlace se pidió para otro correo.",
            expired: {
                title: "Este enlace ha caducado",
                description: "Solicita un enlace nuevo para iniciar sesión.",
            },
            invalid: {
                title: "Este enlace ya no es válido",
                description:
                    "Ya se usó o está incompleto. Solicita un enlace nuevo.",
            },
            failed: {
                title: "No se pudo iniciar sesión",
            },
        },
        validation: {
            emailInvalid: "Email no válido",
        },
        requestAnother: "Solicitar otro enlace",
        backToSignIn: "Volver al inicio de sesión",
    },
};
