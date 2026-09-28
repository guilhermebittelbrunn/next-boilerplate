const LOOPBACK_HOST_RE = /^127\.0\.0\.1:\d+$/;

const REQUIRED_HOSTS = [
    "FIRESTORE_EMULATOR_HOST",
    "FIREBASE_STORAGE_EMULATOR_HOST",
] as const;

for (const variable of REQUIRED_HOSTS) {
    const value = process.env[variable] ?? "";
    if (!LOOPBACK_HOST_RE.test(value)) {
        throw new Error(
            `${variable} is "${value}". The emulator suite only runs against emulators on 127.0.0.1, so nothing it writes or deletes can reach a real project.`
        );
    }
}
