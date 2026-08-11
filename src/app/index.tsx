import { Analytics } from "@vercel/analytics/react";
import { BrowserRouter } from "react-router-dom";
import { PopupProvider, ToastProvider } from "../components/ui";
import { UIProvider } from "../context/UIContext";
import { ComposeWorkspaceProvider } from "../features/compose-workspace";
import { AppRoutes } from "./router";

const vercelAnalyticsEnabled = import.meta.env.VITE_DISABLE_VERCEL_ANALYTICS !== "true";

interface AppProps {
    basename?: string;
}

export default function App({ basename = import.meta.env.BASE_URL }: AppProps) {
    return (
        <BrowserRouter basename={basename}>
            <UIProvider>
                <ComposeWorkspaceProvider>
                    <PopupProvider>
                        <ToastProvider>
                            <AppRoutes />
                        </ToastProvider>
                    </PopupProvider>
                    {vercelAnalyticsEnabled && <Analytics />}
                </ComposeWorkspaceProvider>
            </UIProvider>
        </BrowserRouter>
    );
}
