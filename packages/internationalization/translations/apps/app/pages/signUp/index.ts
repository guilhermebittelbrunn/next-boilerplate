import { signInTranslations } from "../signIn";

export const signUpTranslations = {
    "pt-br": {
        meta: {
            title: "Cadastrar",
            description: "Crie sua conta",
        },
        form: {
            email: "Email",
            password: "Senha",
            confirmPassword: "Confirmar senha",
            submit: "Cadastrar",
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
            password: "Password",
            confirmPassword: "Confirmar contraseña",
            submit: "Sign Up",
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
            confirmPassword: "Confirmar contraseña",
            password: "Contraseña",
            submit: "Registrarse",
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
