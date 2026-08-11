import { describe, expect, it } from "vitest";
import { normalizeToAST } from "../models/normalizeToAST";
import { stateToFlow } from "./flowConverter";

describe("stateToFlow", () => {
    it("preserves resource nodes, relationships, and saved positions from the workspace AST", () => {
        const ast = normalizeToAST({
            services: {
                api: {
                    image: "api:1",
                    depends_on: ["db"],
                    networks: ["backend"],
                    volumes: ["data:/var/lib/api"],
                    _position: { x: 11, y: 12 },
                },
                db: { image: "postgres:17", _position: { x: 21, y: 22 } },
            },
            networks: { backend: { driver: "bridge", _position: { x: 31, y: 32 } } },
            volumes: { data: { driver: "local", _position: { x: 41, y: 42 } } },
            secrets: { token: { file: "./token.txt", _position: { x: 51, y: 52 } } },
            configs: { settings: { file: "./settings.yml", _position: { x: 61, y: 62 } } },
        });

        const flow = stateToFlow(ast);

        expect(flow.nodes).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ id: "service-api", position: { x: 11, y: 12 } }),
                expect.objectContaining({ id: "service-db", position: { x: 21, y: 22 } }),
                expect.objectContaining({ id: "network-backend", position: { x: 31, y: 32 } }),
                expect.objectContaining({ id: "volume-data", position: { x: 41, y: 42 } }),
                expect.objectContaining({ id: "secret-token", position: { x: 51, y: 52 } }),
                expect.objectContaining({ id: "config-settings", position: { x: 61, y: 62 } }),
            ]),
        );
        expect(flow.edges.map((edge) => edge.id)).toEqual(["dep-api-db", "net-api-backend", "vol-api-data"]);
        expect(flow.edges).toEqual([
            expect.objectContaining({
                id: "dep-api-db",
                sourceHandle: "deps-out",
                targetHandle: "deps-in",
                animated: true,
            }),
            expect.objectContaining({
                id: "net-api-backend",
                sourceHandle: "network-out",
                targetHandle: "network-in",
            }),
            expect.objectContaining({
                id: "vol-api-data",
                sourceHandle: "volume-out",
                targetHandle: "volume-in",
            }),
        ]);
    });
});
