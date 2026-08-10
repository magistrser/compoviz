/* eslint-disable react-refresh/only-export-components */
import { render } from "@testing-library/react";
import type { PropsWithChildren, ReactElement } from "react";
import type { RenderOptions, RenderResult } from "@testing-library/react";
import { ComposeProvider } from "../hooks/useCompose";
import { UIProvider } from "../context/UIContext";
import { ToastProvider } from "../components/ui";

/**
 * Custom render function that wraps components with all necessary providers
 */
export function renderWithProviders(
    ui: ReactElement,
    renderOptions: Omit<RenderOptions, "wrapper"> = {},
): RenderResult {
    function Wrapper({ children }: PropsWithChildren) {
        return (
            <UIProvider>
                <ComposeProvider>
                    <ToastProvider>{children}</ToastProvider>
                </ComposeProvider>
            </UIProvider>
        );
    }

    return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Re-export everything from testing library
export * from "@testing-library/react";
export { renderWithProviders as render };
