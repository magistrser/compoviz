import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { routes } from "./routes";

const HomePage = lazy(() => import("../../pages/home"));

function PageFallback() {
    return (
        <div
            className="page-loading"
            role="status"
        >
            Loading Compoviz…
        </div>
    );
}

export function AppRoutes() {
    return (
        <Suspense fallback={<PageFallback />}>
            <Routes>
                <Route
                    path={routes.home}
                    element={<HomePage />}
                />
            </Routes>
        </Suspense>
    );
}
