import { act, renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { describe, expect, it } from "vitest";
import { ProjectComparisonProvider, useProjectComparison } from ".";

function wrapper({ children }: PropsWithChildren) {
    return <ProjectComparisonProvider>{children}</ProjectComparisonProvider>;
}

describe("useProjectComparison", () => {
    it("uses Compose name, imported filename, then Untitled naming precedence", () => {
        const { result } = renderHook(useProjectComparison, { wrapper });

        act(() => {
            result.current.admit({ yaml: "name: '  named-project  '\nservices: {}", importedFilename: "ignored.yaml" });
            result.current.admit({ yaml: "services: {}", importedFilename: "compose.production.yaml" });
            result.current.admit({ yaml: "services: {}", importedFilename: "" });
        });

        expect(result.current.snapshot.projects.map((project) => project.name)).toEqual([
            "named-project",
            "compose.production",
            "Untitled",
        ]);
        expect(result.current.snapshot.projects.every((project) => !("ast" in project))).toBe(true);
    });

    it("admits one to three projects in order", () => {
        const { result } = renderHook(useProjectComparison, { wrapper });
        const outcomes: Array<ReturnType<typeof result.current.admit>> = [];

        act(() => {
            outcomes.push(result.current.admit({ yaml: "services: {}", importedFilename: "one.yml" }));
            outcomes.push(result.current.admit({ yaml: "services: {}", importedFilename: "two.yml" }));
            outcomes.push(result.current.admit({ yaml: "services: {}", importedFilename: "three.yml" }));
        });

        expect(outcomes.every((outcome) => outcome.status === "accepted")).toBe(true);
        expect(result.current.snapshot.projects.map((project) => project.name)).toEqual(["one", "two", "three"]);
    });

    it("rejects a fourth project before parsing without changing the snapshot", () => {
        const { result } = renderHook(useProjectComparison, { wrapper });
        act(() => {
            result.current.admit({ yaml: "services: {}", importedFilename: "one.yml" });
            result.current.admit({ yaml: "services: {}", importedFilename: "two.yml" });
            result.current.admit({ yaml: "services: {}", importedFilename: "three.yml" });
        });
        const before = result.current.snapshot;
        let outcome: ReturnType<typeof result.current.admit> | undefined;

        act(() => {
            outcome = result.current.admit({ yaml: "invalid: [", importedFilename: "four.yml" });
        });

        expect(outcome).toEqual({ status: "rejected", reason: "capacity" });
        expect(result.current.snapshot).toBe(before);
    });

    it("rejects invalid YAML and non-object roots without mutation", () => {
        const { result } = renderHook(useProjectComparison, { wrapper });
        const before = result.current.snapshot;
        const outcomes: Array<ReturnType<typeof result.current.admit>> = [];

        act(() => {
            outcomes.push(result.current.admit({ yaml: "invalid: [", importedFilename: "invalid.yml" }));
            outcomes.push(result.current.admit({ yaml: "- item", importedFilename: "list.yml" }));
        });

        expect(outcomes[0]).toMatchObject({ status: "rejected", reason: "parsing" });
        expect(outcomes[1]).toEqual({
            status: "rejected",
            reason: "parsing",
            error: "Compose YAML must contain an object",
        });
        expect(result.current.snapshot).toBe(before);
    });

    it("keeps findings, severity counts, prose, and diagram input synchronized after admission", () => {
        const { result } = renderHook(useProjectComparison, { wrapper });
        act(() => {
            result.current.admit({
                yaml: "name: frontend\nservices:\n  web:\n    ports:\n      - '8080:80'",
                importedFilename: "frontend.yml",
            });
            result.current.admit({
                yaml: "name: backend\nservices:\n  api:\n    ports:\n      - '8080:8080'",
                importedFilename: "backend.yml",
            });
        });

        expect(result.current.snapshot.findings).toHaveLength(1);
        expect(result.current.snapshot.severityCounts).toEqual({ errors: 1, warnings: 0, info: 0 });
        expect(result.current.snapshot.summary).toBe("1 error found across projects.");
        expect(result.current.snapshot.diagramDot).toContain('label="frontend"');
        expect(result.current.snapshot.diagramDot).toContain('label="backend"');
        expect(result.current.snapshot.diagramDot).toContain("p0_web");
        expect(result.current.snapshot.diagramDot).toContain("p1_api");
        expect(result.current.snapshot.diagramDot).toContain('color="#ef4444"');
    });

    it("recomputes the whole snapshot after removal and clear", () => {
        const { result } = renderHook(useProjectComparison, { wrapper });
        act(() => {
            result.current.admit({
                yaml: "name: one\nservices:\n  web:\n    ports: ['8080:80']",
                importedFilename: "one.yml",
            });
            result.current.admit({
                yaml: "name: two\nservices:\n  api:\n    ports: ['8080:80']",
                importedFilename: "two.yml",
            });
        });
        const projectToRemove = result.current.snapshot.projects[1];
        if (!projectToRemove) throw new Error("Expected a second admitted project");

        act(() => result.current.remove(projectToRemove.id));
        expect(result.current.snapshot.projects.map((project) => project.name)).toEqual(["one"]);
        expect(result.current.snapshot.findings).toEqual([]);
        expect(result.current.snapshot.severityCounts).toEqual({ errors: 0, warnings: 0, info: 0 });
        expect(result.current.snapshot.summary).toBe("No conflicts or overlaps detected across projects.");
        expect(result.current.snapshot.diagramDot).toContain('label="one"');
        expect(result.current.snapshot.diagramDot).not.toContain('label="two"');

        act(() => result.current.clear());
        expect(result.current.snapshot.projects).toEqual([]);
        expect(result.current.snapshot.findings).toEqual([]);
        expect(result.current.snapshot.summary).toBe("No conflicts or overlaps detected across projects.");
        expect(result.current.snapshot.diagramDot).toBe(
            'digraph G { bgcolor="transparent" empty [label="No projects"] }',
        );
    });
});
