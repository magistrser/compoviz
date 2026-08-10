import { describe, it, expect } from "vitest";
import { cleanObject, generateYaml, parseYaml } from "./yaml";
import { requireRecord } from "../test/typeHelpers";

describe("yaml utils", () => {
    describe("cleanObject", () => {
        it("removes empty strings and null/undefined values", () => {
            const input = {
                a: "test",
                b: "",
                c: null,
                d: undefined,
                e: { f: "", g: "value" },
            };
            const expected = {
                a: "test",
                e: { g: "value" },
            };
            expect(cleanObject(input)).toEqual(expected);
        });

        it("removes internal properties starting with underscore", () => {
            const input = {
                service: "web",
                _position: { x: 10, y: 20 },
                data: { _internal: true, ok: true },
            };
            const expected = {
                service: "web",
                data: { ok: true },
            };
            expect(cleanObject(input)).toEqual(expected);
        });

        it("returns undefined for empty objects after cleaning", () => {
            const input = { _pos: 1, empty: "" };
            expect(cleanObject(input)).toBeUndefined();
        });
    });

    describe("generateYaml", () => {
        it("generates basic valid yaml structure", () => {
            const state = {
                services: {
                    web: { image: "nginx:latest" },
                },
            };
            const output = generateYaml(state);
            expect(output).toContain("services:");
            expect(output).toContain("web:");
            expect(output).toContain("image: nginx:latest");
        });

        it("does not include version per modern spec", () => {
            const state = {
                version: "3.8",
                services: { web: { image: "nginx" } },
            };
            const output = generateYaml(state);
            expect(output).not.toContain("version:");
        });

        it("includes project name if present", () => {
            const state = {
                name: "my-project",
                services: { web: { image: "nginx" } },
            };
            const output = generateYaml(state);
            expect(output).toContain("name: my-project");
        });
    });

    describe("parseYaml", () => {
        it("parses valid yaml string to object", () => {
            const yamlStr = "services:\n  web:\n    image: nginx";
            const result = parseYaml(yamlStr);
            const services = requireRecord(requireRecord(result).services);
            expect(requireRecord(services.web).image).toBe("nginx");
        });
    });
});
