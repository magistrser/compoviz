import { Analytics } from "@vercel/analytics/react";
import { BrowserRouter } from "react-router-dom";
import { PopupProvider, ToastProvider } from "../components/ui";
import { UIProvider } from "../context/UIContext";
import { ComposeProvider } from "../hooks/useCompose";
import { AppRoutes } from "./router";

const vercelAnalyticsEnabled = import.meta.env.VITE_DISABLE_VERCEL_ANALYTICS !== "true";

export default function App() {
    return (
        <BrowserRouter>
            <UIProvider>
                <ComposeProvider>
                    <PopupProvider>
                        <ToastProvider>
                            <AppRoutes />
                        </ToastProvider>
                    </PopupProvider>
                    {vercelAnalyticsEnabled && <Analytics />}
                </ComposeProvider>
            </UIProvider>
        </BrowserRouter>
    );
}
