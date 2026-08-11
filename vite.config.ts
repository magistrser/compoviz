import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const srcDir = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
    base: process.env.VITE_BASE_PATH ?? "/",
    plugins: [react()],
    resolve: {
        alias: {
            "@app": srcDir,
        },
    },
    server: {
        port: 3000,
        strictPort: true,
    },
    preview: {
        port: 4173,
        strictPort: true,
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes("node_modules/@xyflow/react")) {
                        return "vendor-flow";
                    }

                    if (
                        id.includes("node_modules/react/") ||
                        id.includes("node_modules/react-dom/") ||
                        id.includes("node_modules/react-router")
                    ) {
                        return "vendor-react";
                    }
                },
            },
        },
    },
});
