import type { ActionLinkData } from "./templates/action-link";
import type { ContactData } from "./templates/contact";
import type { EmailChangeNoticeData } from "./templates/email-change-notice";
import type { WelcomeData } from "./templates/welcome";

export const welcomePreviewData: WelcomeData = {
    name: "Jane Smith",
    url: "https://app.example.com/dashboard",
};

export const actionLinkPreviewData: ActionLinkData = {
    name: "Jane Smith",
    url: "https://app.example.com/access?token=example-token",
    action: "confirmAccess",
};

export const contactPreviewData: ContactData = {
    name: "Jane Smith",
    email: "jane.smith@example.com",
    message: "I'm interested in your services.",
};

export const emailChangeNoticePreviewData: EmailChangeNoticeData = {
    name: "Jane Smith",
    newEmail: "jane.new@example.com",
};
