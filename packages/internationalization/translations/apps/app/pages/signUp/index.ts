import { signInTranslations } from "../signIn";

export const signUpTranslations = {
    "pt-br": {
        meta: {
            title: "Cadastrar",
            description: "Crie sua conta",
        },
        form: {
            email: "Email",
            emailPlaceholder: "seu@email.com",
            password: "Senha",
            passwordPlaceholder: "••••••••",
            confirmPassword: "Confirmar senha",
            submit: "Cadastrar",
        },
        validation: {
            emailInvalid: "Email inválido",
            passwordMin: "A senha deve ter pelo menos 6 caracteres",
            passwordsDoNotMatch: "As senhas não coincidem",
        },
        signUp: "Cadastrar",
        enterWithYourAccount: "Entre com sua conta para continuar",
        orContinueWith: "Ou continue com",
        googleSignIn: "Continuar com Google",
        signIn: "Entrar",
        noAccount: "Não tem uma conta? ",
        layout: signInTranslations["pt-br"].layout,
    },
    en: {
        meta: {
            title: "Sign Up",
            description: "Sign up to your account",
        },
        form: {
            email: "Email",
            emailPlaceholder: "you@email.com",
            password: "Password",
            passwordPlaceholder: "••••••••",
            confirmPassword: "Confirm password",
            submit: "Sign Up",
        },
        validation: {
            emailInvalid: "Invalid email",
            passwordMin: "Password must be at least 6 characters",
            passwordsDoNotMatch: "Passwords do not match",
        },
        signUp: "Sign Up",
        enterWithYourAccount: "Enter with your account to continue",
        orContinueWith: "Or continue with",
        googleSignIn: "Continue with Google",
        signIn: "Sign In",
        noAccount: "Don't have an account? ",
        layout: signInTranslations.en.layout,
    },
    es: {
        meta: {
            title: "Registrarse",
            description: "Regístrate en tu cuenta",
        },
        form: {
            email: "Email",
            emailPlaceholder: "tu@email.com",
            password: "Contraseña",
            passwordPlaceholder: "••••••••",
            confirmPassword: "Confirmar contraseña",
            submit: "Registrarse",
        },
        validation: {
            emailInvalid: "Email no válido",
            passwordMin: "La contraseña debe tener al menos 6 caracteres",
            passwordsDoNotMatch: "Las contraseñas no coinciden",
        },
        signUp: "Registrarse",
        enterWithYourAccount: "Regístrate en tu cuenta para continuar",
        orContinueWith: "O continuar con",
        googleSignIn: "Continuar con Google",
        signIn: "Iniciar sesión",
        noAccount: "¿No tienes una cuenta? ",
        layout: signInTranslations.es.layout,
    },
};
