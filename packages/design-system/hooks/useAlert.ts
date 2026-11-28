"use client";

import { toast } from "sonner";

type NotificationType = "success" | "info" | "warning" | "error";

const openNotification = (type: NotificationType, message: string) => {
    toast[type](message);
};

export const useAlert = () => {
    const successAlert = (message: string) => {
        openNotification("success", message);
    };

    const infoAlert = (message: string) => {
        openNotification("info", message);
    };

    const warningAlert = (message: string) => {
        openNotification("warning", message);
    };

    const errorAlert = (message: string) => {
        openNotification("error", message);
    };

    return { successAlert, infoAlert, warningAlert, errorAlert };
};

export default useAlert;
