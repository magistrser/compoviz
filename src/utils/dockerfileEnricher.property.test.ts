import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import { enrichComposeState } from "./dockerfileEnricher";
import type { ComposeBuild, ComposeService } from "../models/composeTypes";

vi.mock("./dockerfileFetcher", () => ({
    fetchDockerfile: vi.fn(),
}));

vi.mock("./dockerfileParser", () => ({
    parseDockerfile: vi.fn(),
}));

import { fetchDockerfile } from "./dockerfileFetcher";
import { parseDockerfile } from "./dockerfileParser";

/**
 * Property-based tests for the Dockerfile enricher.
 * Uses fast-check to verify correctness properties across many random inputs.
 *
 * Validates: Requirements 4.1, 4.2, 4.3, 4.5
 */
describe("Dockerfile Enricher - Property-Based Tests", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // --- Generators ---

    /** Generate a valid Docker image name */
    const arbImageName = () =>
        fc
            .tuple(
                fc.stringMatching(/^[a-z][a-z0-9]{0,11}$/),
                fc.option(fc.stringMatching(/^[a-z0-9][a-z0-9.-]{0,7}$/), { nil: undefined }),
            )
            .map(([name, tag]) => (tag ? `${name}:${tag}` : name));

    /** Generate a valid port number */
    const arbPort = () => fc.integer({ min: 1, max: 65535 });

    /** Generate exposed ports array */
    const arbExposedPorts = () =>
        fc.array(
            fc.tuple(arbPort(), fc.constantFrom("tcp", "udp")).map(([port, protocol]) => ({
                port,
                protocol,
            })),
            { minLength: 0, maxLength: 5 },
        );

    /** Generate a build context path */
    const arbContextPath = () =>
        fc.constantFrom("./backend", "./frontend", "./api", "./worker", "services/web", "./app");

    /** Generate a build directive (string or object) */
    const arbBuildDirective = () =>
        fc.oneof(
            arbContextPath(),
            fc
                .record({
                    context: arbContextPath(),
                    dockerfile: fc.option(fc.constantFrom("Dockerfile", "Dockerfile.prod", "Dockerfile.dev"), {
                        nil: undefined,
                    }),
                    target: fc.option(fc.constantFrom("builder", "production", "dev"), { nil: undefined }),
                })
                .map(({ context, dockerfile, target }) => {
                    const obj: ComposeBuild = { context };
                    if (dockerfile) obj.dockerfile = dockerfile;
                    if (target) obj.target = target;
                    return obj;
                }),
        );

    /** Generate a service name */
    const arbServiceName = () => fc.stringMatching(/^[a-z][a-z0-9_]{0,9}$/);

    /**
     * Property 4: Enrichment Field Assignment
     *
     * For any compose state with build directives and available Dockerfiles,
     * _resolvedImage is set only when no explicit image exists,
     * _resolvedPorts only when no explicit ports exist.
     *
     * Validates: Requirements 4.1, 4.2, 4.3
     */
    describe("Property 4: Enrichment Field Assignment", () => {
        it("_resolvedImage is set only when service has no explicit image field", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.tuple(
                        arbServiceName(),
                        arbBuildDirective(),
                        arbImageName(),
                        fc.boolean(), // whether service has explicit image
                    ),
                    async ([serviceName, build, resolvedImage, hasExplicitImage]) => {
                        vi.clearAllMocks();

                        vi.mocked(fetchDockerfile).mockResolvedValue("FROM something\n");
                        vi.mocked(parseDockerfile).mockReturnValue({
                            baseImage: resolvedImage,
                            exposedPorts: [],
                        });

                        const service: ComposeService = { build };
                        if (hasExplicitImage) {
                            service.image = "explicit:latest";
                        }

                        const state = { services: { [serviceName]: service } };
                        await enrichComposeState(state);

                        if (hasExplicitImage) {
                            // Should NOT set _resolvedImage when explicit image exists
                            expect(service._resolvedImage).toBeUndefined();
                        } else {
                            // Should set _resolvedImage when no explicit image
                            expect(service._resolvedImage).toBe(resolvedImage);
                        }
                    },
                ),
                { numRuns: 100 },
            );
        });

        it("_resolvedPorts is set only when service has no explicit ports field", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.tuple(
                        arbServiceName(),
                        arbBuildDirective(),
                        arbExposedPorts().filter((ports) => ports.length > 0),
                        fc.boolean(), // whether service has explicit ports
                    ),
                    async ([serviceName, build, exposedPorts, hasExplicitPorts]) => {
                        vi.clearAllMocks();

                        vi.mocked(fetchDockerfile).mockResolvedValue("FROM something\nEXPOSE 3000\n");
                        vi.mocked(parseDockerfile).mockReturnValue({
                            baseImage: "node:18",
                            exposedPorts,
                        });

                        const service: ComposeService = { build };
                        if (hasExplicitPorts) {
                            service.ports = ["3000:3000"];
                        }

                        const state = { services: { [serviceName]: service } };
                        await enrichComposeState(state);

                        if (hasExplicitPorts) {
                            // Should NOT set _resolvedPorts when explicit ports exist
                            expect(service._resolvedPorts).toBeUndefined();
                        } else {
                            // Should set _resolvedPorts when no explicit ports
                            expect(service._resolvedPorts).toEqual(exposedPorts);
                        }
                    },
                ),
                { numRuns: 100 },
            );
        });
    });

    /**
     * Property 5: Enrichment Failure Isolation
     *
     * For any service where fetching/parsing fails (returns null),
     * the service object remains unchanged with no new fields added.
     *
     * Validates: Requirements 4.5
     */
    describe("Property 5: Enrichment Failure Isolation", () => {
        it("no _resolvedImage or _resolvedPorts fields added when fetch fails", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.tuple(
                        arbServiceName(),
                        arbBuildDirective(),
                        // Generate arbitrary pre-existing fields
                        fc.record({
                            environment: fc.option(
                                fc.dictionary(
                                    fc.stringMatching(/^[A-Z_]{1,8}$/),
                                    fc.string({ minLength: 1, maxLength: 10 }),
                                ),
                                { nil: undefined },
                            ),
                            volumes: fc.option(
                                fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 3 }),
                                { nil: undefined },
                            ),
                        }),
                    ),
                    async ([serviceName, build, extraFields]) => {
                        vi.clearAllMocks();

                        // Simulate fetch failure
                        vi.mocked(fetchDockerfile).mockResolvedValue(null);

                        const service: ComposeService = { build };
                        if (extraFields.environment) service.environment = extraFields.environment;
                        if (extraFields.volumes) service.volumes = extraFields.volumes;

                        // Snapshot pre-existing keys
                        const originalKeys = Object.keys(service).sort();
                        const originalValues = JSON.parse(JSON.stringify(service));

                        const state = { services: { [serviceName]: service } };
                        await enrichComposeState(state);

                        // No new enrichment fields should be added
                        expect(service._resolvedImage).toBeUndefined();
                        expect(service._resolvedPorts).toBeUndefined();

                        // All pre-existing fields should remain unchanged
                        for (const key of originalKeys) {
                            expect(JSON.stringify(service[key])).toBe(JSON.stringify(originalValues[key]));
                        }
                    },
                ),
                { numRuns: 100 },
            );
        });

        it("no _resolvedImage or _resolvedPorts fields added when parse returns null baseImage", async () => {
            await fc.assert(
                fc.asyncProperty(fc.tuple(arbServiceName(), arbBuildDirective()), async ([serviceName, build]) => {
                    vi.clearAllMocks();

                    vi.mocked(fetchDockerfile).mockResolvedValue("# empty dockerfile\n");
                    vi.mocked(parseDockerfile).mockReturnValue({
                        baseImage: null,
                        exposedPorts: [],
                    });

                    const service: ComposeService = { build };
                    const state = { services: { [serviceName]: service } };
                    await enrichComposeState(state);

                    expect(service._resolvedImage).toBeUndefined();
                    expect(service._resolvedPorts).toBeUndefined();
                }),
                { numRuns: 100 },
            );
        });
    });
});
