import { describe, it, expect } from "vitest";
import { parseCompose } from "../utils/composeParser";
import { generateGraphviz } from "../utils/graphviz";
import { galleryExamples } from "./examplesGallery";
import { requireCompose, requireValue } from "../test/typeHelpers";

/**
 * Integration tests: Verify gallery examples work end-to-end
 * through the actual parser and graphviz pipeline.
 */
describe("Examples Gallery Integration", () => {
    describe("full pipeline: parse → graphviz", () => {
        it("every example produces a non-null compose object", () => {
            for (const example of galleryExamples) {
                const result = parseCompose(example.yaml, {
                    enableIncludes: false,
                    enableExtends: true,
                    enableVariables: true,
                    enableProfiles: false,
                });

                expect(result.compose, `${example.id} produced null compose`).not.toBeNull();
                expect(requireCompose(result).services, `${example.id} has no services`).toBeDefined();
            }
        });

        it("every example generates non-empty graphviz DOT", () => {
            for (const example of galleryExamples) {
                const result = parseCompose(example.yaml, {
                    enableIncludes: false,
                    enableExtends: true,
                    enableVariables: true,
                    enableProfiles: false,
                });

                const dot = generateGraphviz(result.compose);
                expect(dot, `${example.id} produced empty DOT`).toBeTruthy();
                expect(dot.length, `${example.id} DOT too short`).toBeGreaterThan(10);
                expect(dot).toContain("digraph");
            }
        });

        it("example loads and diagram renders with correct service count", () => {
            for (const example of galleryExamples) {
                const result = parseCompose(example.yaml, {
                    enableIncludes: false,
                    enableExtends: true,
                    enableVariables: true,
                    enableProfiles: false,
                });

                const serviceCount = Object.keys(requireCompose(result).services).length;
                expect(serviceCount, `${example.id}: expected ${example.serviceCount} services`).toBe(
                    example.serviceCount,
                );
            }
        });

        it("no example produces fatal errors", () => {
            for (const example of galleryExamples) {
                const result = parseCompose(example.yaml, {
                    enableIncludes: false,
                    enableExtends: true,
                    enableVariables: true,
                    enableProfiles: false,
                });

                const fatalErrors = (result.errors || []).filter((e) => e.type === "fatal" || e.type === "error");
                expect(fatalErrors, `${example.id} has fatal errors: ${JSON.stringify(fatalErrors)}`).toHaveLength(0);
            }
        });
    });

    describe("idempotent loading", () => {
        it("loading same example twice produces identical state", () => {
            for (const example of galleryExamples) {
                const result1 = parseCompose(example.yaml, {
                    enableIncludes: false,
                    enableExtends: true,
                    enableVariables: true,
                    enableProfiles: false,
                });

                const result2 = parseCompose(example.yaml, {
                    enableIncludes: false,
                    enableExtends: true,
                    enableVariables: true,
                    enableProfiles: false,
                });

                expect(result1.compose, `${example.id} not idempotent`).toEqual(result2.compose);
            }
        });
    });

    describe("non-destructive loading", () => {
        it("loading different examples produces different states", () => {
            if (galleryExamples.length < 2) return;

            const firstExample = requireValue(galleryExamples[0]);
            const secondExample = requireValue(galleryExamples[1]);
            const result1 = parseCompose(firstExample.yaml, {
                enableIncludes: false,
                enableExtends: true,
                enableVariables: true,
                enableProfiles: false,
            });

            const result2 = parseCompose(secondExample.yaml, {
                enableIncludes: false,
                enableExtends: true,
                enableVariables: true,
                enableProfiles: false,
            });

            // Different examples should produce different service sets
            const services1 = Object.keys(requireCompose(result1).services);
            const services2 = Object.keys(requireCompose(result2).services);
            expect(services1).not.toEqual(services2);
        });
    });

    describe("error tolerance", () => {
        it("examples with build-only services still parse", () => {
            // Several examples have build: without image:
            const buildExamples = galleryExamples.filter((e) => e.yaml.includes("build:"));

            for (const example of buildExamples) {
                const result = parseCompose(example.yaml, {
                    enableIncludes: false,
                    enableExtends: true,
                    enableVariables: true,
                    enableProfiles: false,
                });

                expect(result.compose, `${example.id} failed with build-only services`).not.toBeNull();
            }
        });

        it("examples with secrets still parse", () => {
            const secretExamples = galleryExamples.filter((e) => e.yaml.includes("secrets:"));

            for (const example of secretExamples) {
                const result = parseCompose(example.yaml, {
                    enableIncludes: false,
                    enableExtends: true,
                    enableVariables: true,
                    enableProfiles: false,
                });

                expect(result.compose, `${example.id} failed with secrets`).not.toBeNull();
                expect(requireCompose(result).secrets).toBeDefined();
            }
        });
    });
});
