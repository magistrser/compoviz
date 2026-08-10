import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const srcDir = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
    resolve: {
        alias: {
            "@app": srcDir,
        },
    },
    test: {
        globals: true,
        environment: "happy-dom",
        setupFiles: ["./src/test/setup.ts"],
    },
});
