import { describe, it, expect } from "vitest";
import { normalizeToAST } from "../models/normalizeToAST";
import { normalizeDependsOn, validateAST } from "./validation";

describe("validation utils", () => {
    describe("normalizeDependsOn", () => {
        it("handles array format", () => {
            expect(normalizeDependsOn(["db", "redis"])).toEqual(["db", "redis"]);
        });

        it("handles object format", () => {
            const input = { db: { condition: "service_healthy" }, redis: {} };
            expect(normalizeDependsOn(input)).toEqual(["db", "redis"]);
        });

        it("handles undefined/null", () => {
            expect(normalizeDependsOn(null)).toEqual([]);
            expect(normalizeDependsOn(undefined)).toEqual([]);
        });
    });

    describe("validateAST", () => {
        it("detects missing image or build", () => {
            const state = { services: { web: {} } };
            const errors = validateAST(normalizeToAST(state));
            expect(errors.some((e) => e.message === "Missing image or build context")).toBe(true);
        });

        it("detects port collisions between services", () => {
            const state = {
                services: {
                    api: { image: "api", ports: ["8080:80"] },
                    web: { image: "web", ports: ["8080:80"] },
                },
            };
            const errors = validateAST(normalizeToAST(state));
            expect(errors.some((e) => e.message.includes("Port binding 0.0.0.0:8080 already used"))).toBe(true);
        });

        it("detects duplicate container names", () => {
            const state = {
                services: {
                    s1: { image: "i1", container_name: "shared" },
                    s2: { image: "i2", container_name: "shared" },
                },
            };
            const errors = validateAST(normalizeToAST(state));
            expect(errors.some((e) => e.message === 'Duplicate container_name "shared"')).toBe(true);
        });

        it("warns about undefined networks", () => {
            const state = {
                services: {
                    web: { image: "nginx", networks: ["frontend"] },
                },
                networks: {},
            };
            const errors = validateAST(normalizeToAST(state));
            expect(errors.some((e) => e.message === 'Network "frontend" not defined')).toBe(true);
        });

        it("reports missing dependencies", () => {
            const state = {
                services: {
                    web: { image: "nginx", depends_on: ["db"] },
                },
            };
            const errors = validateAST(normalizeToAST(state));
            expect(errors.some((e) => e.message === 'Dependency "db" not found')).toBe(true);
        });

        it("preserves checks that depend on the admitted raw service shape", () => {
            const ast = normalizeToAST({
                services: {
                    built: { build: {} },
                    unbuilt: { build: null },
                },
            });

            expect(validateAST(ast)).toEqual([
                {
                    type: "error",
                    entity: "service",
                    name: "unbuilt",
                    message: "Missing image or build context",
                },
            ]);
        });
    });
});
