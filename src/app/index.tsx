import { Analytics } from "@vercel/analytics/react";
import { BrowserRouter } from "react-router-dom";
import { ToastProvider } from "../components/ui";
import { UIProvider } from "../context/UIContext";
import { ComposeProvider } from "../hooks/useCompose";
import { AppRoutes } from "./router";

const vercelAnalyticsEnabled = import.meta.env.VITE_DISABLE_VERCEL_ANALYTICS !== "true";

export default function App() {
    return (
        <BrowserRouter>
            <UIProvider>
                <ComposeProvider>
                    <ToastProvider>
                        <AppRoutes />
                    </ToastProvider>
                    {vercelAnalyticsEnabled && <Analytics />}
                </ComposeProvider>
            </UIProvider>
        </BrowserRouter>
    );
}
