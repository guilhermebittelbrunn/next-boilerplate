const readPort = (name: string, fallback: number) => {
    const value = Number(process.env[name]);
    return Number.isInteger(value) && value > 0 ? value : fallback;
};

// The same ports the `dev` scripts use; the variables only exist to move the suite off
// them when something else is already listening there.
const DEFAULT_APP_PORT = 3000;
const DEFAULT_WEB_PORT = 3001;
const DEFAULT_API_PORT = 3002;

export const APP_PORT = readPort("E2E_APP_PORT", DEFAULT_APP_PORT);
export const WEB_PORT = readPort("E2E_WEB_PORT", DEFAULT_WEB_PORT);
export const API_PORT = readPort("E2E_API_PORT", DEFAULT_API_PORT);

// The API only accepts browser origins spelled with `localhost`, so the three apps are
// never addressed as 127.0.0.1 even though the emulators are.
export const APP_URL = `http://localhost:${APP_PORT}`;
export const WEB_URL = `http://localhost:${WEB_PORT}`;
export const API_URL = `http://localhost:${API_PORT}`;

export const FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
export const AUTH_EMULATOR_HOST = "127.0.0.1:9099";
export const EMULATOR_UI_URL = "http://127.0.0.1:4001";

export type StackUrls = { app: string; web: string; api: string };

export const STACK_URLS: StackUrls = {
    app: APP_URL,
    web: WEB_URL,
    api: API_URL,
};
