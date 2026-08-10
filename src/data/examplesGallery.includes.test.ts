import { describe, it, expect } from "vitest";
import yaml from "js-yaml";
import { parseCompose } from "../utils/composeParser";
import { galleryExamples, type ExampleEntry } from "./examplesGallery";
import { requireCompose, requireRecord } from "../test/typeHelpers";

/**
 * Tests for include resolution support in gallery examples.
 * Validates that examples with the `includes` field resolve correctly.
 */
describe("Examples Gallery - Include Resolution", () => {
    // Get examples that have includes
    const examplesWithIncludes = galleryExamples.filter(
        (example): example is ExampleEntry & { includes: Record<string, string> } => example.includes !== undefined,
    );

    describe("examples with includes field", () => {
        it("all referenced paths in include directives exist in includes object", () => {
            for (const example of examplesWithIncludes) {
                // Parse the YAML to find include directives
                const parsed = requireRecord(yaml.load(example.yaml), `${example.id} YAML`);

                if (parsed.include) {
                    const includes = Array.isArray(parsed.include) ? parsed.include : [parsed.include];
                    for (const inc of includes) {
                        const path = typeof inc === "string" ? inc : requireRecord(inc, "include entry").path;
                        if (typeof path !== "string") throw new Error("Include path must be a string");
                        expect(
                            example.includes[path],
                            `${example.id}: include path "${path}" not found in includes object`,
                        ).toBeDefined();
                    }
                }
            }
        });

        it("parsing with fileMap produces merged compose with all services", () => {
            for (const example of examplesWithIncludes) {
                const fileMap = {
                    "compose.yaml": example.yaml,
                    ...example.includes,
                };

                const result = parseCompose(example.yaml, {
                    basePath: "compose.yaml",
                    fileMap,
                    enableIncludes: true,
                    enableExtends: true,
                    enableVariables: true,
                    enableProfiles: false,
                });

                expect(result.compose, `${example.id} failed to parse with includes`).not.toBeNull();
                const serviceCount = Object.keys(requireCompose(result).services).length;
                expect(
                    serviceCount,
                    `${example.id}: expected ${example.serviceCount} services after include resolution`,
                ).toBe(example.serviceCount);
            }
        });

        it("included file YAML is valid", () => {
            for (const example of examplesWithIncludes) {
                for (const [path, content] of Object.entries(example.includes)) {
                    const parsed = yaml.load(content);
                    expect(parsed, `${example.id}: include "${path}" has invalid YAML`).not.toBeNull();
                }
            }
        });
    });

    describe("examples without includes", () => {
        const examplesWithoutIncludes = galleryExamples.filter((e) => !e.includes);

        it("parse correctly without fileMap", () => {
            for (const example of examplesWithoutIncludes) {
                const result = parseCompose(example.yaml, {
                    enableIncludes: false,
                    enableExtends: true,
                    enableVariables: true,
                    enableProfiles: false,
                });

                expect(result.compose, `${example.id} failed without includes`).not.toBeNull();
            }
        });
    });

    describe("fileMap integration via loadFiles override", () => {
        it("empty fileMap does not break parsing", () => {
            for (const example of galleryExamples) {
                const result = parseCompose(example.yaml, {
                    fileMap: {},
                    enableIncludes: false,
                    enableExtends: true,
                    enableVariables: true,
                    enableProfiles: false,
                });

                expect(result.compose, `${example.id} broke with empty fileMap`).not.toBeNull();
            }
        });
    });
});
