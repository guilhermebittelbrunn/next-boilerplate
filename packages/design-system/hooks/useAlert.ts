"use client";

import { useTheme } from "next-themes";
import { toast } from "react-toastify";

type NotificationType = "success" | "info" | "warning" | "error";

export const useAlert = () => {
    const { theme } = useTheme();

    const openNotification = (type: NotificationType, message: string) => {
        toast[type](message, {
            position: "top-right",
            autoClose: 3000,
            className: "z-[9999] scale-90 md:scale-100 bg-background",
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            theme,
        });
    };

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
