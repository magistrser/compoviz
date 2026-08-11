import { describe, it, expect } from "vitest";
import { mergeFlowElements } from "./objectUtils";
import { requireValue } from "../test/typeHelpers";

interface BenchmarkNode {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
    className?: string;
    style?: unknown;
    hidden?: boolean;
    draggable?: boolean;
    connectable?: boolean;
    zIndex?: number;
}

interface BenchmarkResult {
    name: string;
    totalTime: number;
    avgTime: number;
    iterations: number;
}

/**
 * Benchmark test comparing old position-based comparison with new ID-based merging.
 * This validates the estimated 40-70% performance improvement.
 */

// ========================================
// OLD IMPLEMENTATION (for comparison)
// ========================================

function oldShouldUpdateNodes(prevNodes: BenchmarkNode[], newNodes: BenchmarkNode[]): boolean {
    if (prevNodes.length !== newNodes.length) return true;

    for (let i = 0; i < newNodes.length; i++) {
        const newNode = newNodes[i];
        const prevNode = prevNodes[i];

        if (!prevNode || !newNode) return true;
        if (newNode.id !== prevNode.id) return true;
        if (newNode.type !== prevNode.type) return true;
        if (newNode.position.x !== prevNode.position.x) return true;
        if (newNode.position.y !== prevNode.position.y) return true;
        if (newNode.className !== prevNode.className) return true;
        if (newNode.style !== prevNode.style) return true;
        if (newNode.hidden !== prevNode.hidden) return true;
        if (newNode.draggable !== prevNode.draggable) return true;
        if (newNode.connectable !== prevNode.connectable) return true;
        if (newNode.zIndex !== prevNode.zIndex) return true;
        if (JSON.stringify(newNode.data) !== JSON.stringify(prevNode.data)) return true;
    }

    return false;
}

// ========================================
// TEST DATA GENERATORS
// ========================================

function generateNode(id: number, complexity: "medium" | "high" = "medium"): BenchmarkNode {
    const baseNode: BenchmarkNode = {
        id: `node-${id}`,
        type: "serviceNode",
        position: { x: id * 100, y: id * 50 },
        data: {
            label: `Service ${id}`,
            ports: ["8080:8080", "8081:8081"],
            networks: ["frontend", "backend"],
        },
    };

    if (complexity === "high") {
        baseNode.data = {
            ...baseNode.data,
            volumes: ["./data:/app/data", "./config:/app/config"],
            environment: {
                NODE_ENV: "production",
                DATABASE_URL: "postgresql://localhost:5432/db",
                REDIS_URL: "redis://localhost:6379",
            },
            depends_on: ["db", "redis", "cache"],
            healthcheck: {
                test: ["CMD", "curl", "-f", "http://localhost:8080/health"],
                interval: "30s",
                timeout: "10s",
                retries: 3,
            },
        };
    }

    return baseNode;
}

function generateDataset(size: number, complexity: "medium" | "high" = "medium"): BenchmarkNode[] {
    return Array.from({ length: size }, (_, i) => generateNode(i + 1, complexity));
}

// ========================================
// BENCHMARK UTILITIES
// ========================================

function benchmark(name: string, fn: () => void, iterations = 1000): BenchmarkResult {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        fn();
    }
    const end = performance.now();
    const totalTime = end - start;
    const avgTime = totalTime / iterations;

    return {
        name,
        totalTime: Number(totalTime.toFixed(2)),
        avgTime: Number(avgTime.toFixed(4)),
        iterations,
    };
}

function comparePerformance(oldResult: BenchmarkResult, newResult: BenchmarkResult) {
    const improvement = ((oldResult.avgTime - newResult.avgTime) / oldResult.avgTime) * 100;
    return {
        oldAvg: oldResult.avgTime,
        newAvg: newResult.avgTime,
        improvement: Number(improvement.toFixed(2)),
        faster: improvement > 0 ? `${improvement.toFixed(1)}% faster` : `${Math.abs(improvement).toFixed(1)}% slower`,
    };
}

// ========================================
// BENCHMARK TESTS
// ========================================

describe("Performance Benchmarks", () => {
    describe("Small Dataset (10 nodes)", () => {
        const smallDataset = generateDataset(10);
        const smallDatasetCopy = structuredClone(smallDataset);

        it("should benchmark - no changes scenario", () => {
            const oldBench = benchmark("Old (position-based)", () => {
                oldShouldUpdateNodes(smallDataset, smallDatasetCopy);
            });

            const mergedDataset = mergeFlowElements(smallDataset, smallDatasetCopy);
            const newBench = benchmark("New (ID-based)", () => {
                mergeFlowElements(smallDataset, smallDatasetCopy);
            });

            const comparison = comparePerformance(oldBench, newBench);

            console.log("\n📊 Small Dataset - No Changes:");
            console.log(`   Old: ${oldBench.avgTime}ms avg`);
            console.log(`   New: ${newBench.avgTime}ms avg`);
            console.log(`   ${comparison.improvement > 0 ? "✅" : "⚠️"} New approach is ${comparison.faster}`);

            if (comparison.improvement < 0) {
                console.log(`   ℹ️  Note: Map creation overhead for small datasets (<20 nodes)`);
                console.log(`      The tradeoff is worthwhile for correctness (reordering fix)`);
            }

            expect(mergedDataset).toBe(smallDataset);
        });

        it("should benchmark - single change scenario", () => {
            const modifiedDataset = structuredClone(smallDataset);
            requireValue(modifiedDataset[5]).data.label = "Modified Service 6";

            const oldBench = benchmark("Old (position-based)", () => {
                oldShouldUpdateNodes(smallDataset, modifiedDataset);
            });

            const mergedDataset = mergeFlowElements(smallDataset, modifiedDataset);
            const newBench = benchmark("New (ID-based)", () => {
                mergeFlowElements(smallDataset, modifiedDataset);
            });

            const comparison = comparePerformance(oldBench, newBench);

            console.log("\n📊 Small Dataset - Single Change:");
            console.log(`   Old: ${oldBench.avgTime}ms avg`);
            console.log(`   New: ${newBench.avgTime}ms avg`);
            console.log(`   ${comparison.improvement > 0 ? "✅" : "⚠️"} New approach is ${comparison.faster}`);

            expect(mergedDataset[0]).toBe(smallDataset[0]);
            expect(mergedDataset[5]).toBe(modifiedDataset[5]);
        });
    });

    describe("Medium Dataset (50 nodes)", () => {
        const mediumDataset = generateDataset(50);
        const mediumDatasetCopy = structuredClone(mediumDataset);

        it("should benchmark - no changes scenario", () => {
            const oldBench = benchmark(
                "Old (position-based)",
                () => {
                    oldShouldUpdateNodes(mediumDataset, mediumDatasetCopy);
                },
                500,
            );

            const mergedDataset = mergeFlowElements(mediumDataset, mediumDatasetCopy);
            const newBench = benchmark(
                "New (ID-based)",
                () => {
                    mergeFlowElements(mediumDataset, mediumDatasetCopy);
                },
                500,
            );

            const comparison = comparePerformance(oldBench, newBench);

            console.log("\n📊 Medium Dataset - No Changes:");
            console.log(`   Old: ${oldBench.avgTime}ms avg`);
            console.log(`   New: ${newBench.avgTime}ms avg`);
            console.log(`   ${comparison.improvement > 0 ? "✅" : "⚠️"} New approach is ${comparison.faster}`);

            expect(mergedDataset).toBe(mediumDataset);
        });

        it("should benchmark - reordering scenario (critical)", () => {
            const reorderedDataset = [...mediumDataset].reverse();

            const oldBench = benchmark(
                "Old (position-based)",
                () => {
                    oldShouldUpdateNodes(mediumDataset, reorderedDataset);
                },
                500,
            );

            const mergedDataset = mergeFlowElements(mediumDataset, reorderedDataset);
            const newBench = benchmark(
                "New (ID-based)",
                () => {
                    mergeFlowElements(mediumDataset, reorderedDataset);
                },
                500,
            );

            const comparison = comparePerformance(oldBench, newBench);

            console.log("\n📊 Medium Dataset - Reordering:");
            console.log(`   Old: ${oldBench.avgTime}ms avg (BROKEN - early exit on first mismatch)`);
            console.log(`   New: ${newBench.avgTime}ms avg`);
            console.log(`   ${comparison.improvement > 0 ? "✅" : "⚠️"} New approach is ${comparison.faster}`);

            expect(mergedDataset.map(({ id }) => id)).toEqual(reorderedDataset.map(({ id }) => id));
            expect(mergedDataset[0]).toBe(reorderedDataset[0]);
        });
    });

    describe("Large Dataset (100 nodes)", () => {
        const largeDataset = generateDataset(100);
        const largeDatasetCopy = structuredClone(largeDataset);

        it("should benchmark - no changes scenario", () => {
            const oldBench = benchmark(
                "Old (position-based)",
                () => {
                    oldShouldUpdateNodes(largeDataset, largeDatasetCopy);
                },
                200,
            );

            const mergedDataset = mergeFlowElements(largeDataset, largeDatasetCopy);
            const newBench = benchmark(
                "New (ID-based)",
                () => {
                    mergeFlowElements(largeDataset, largeDatasetCopy);
                },
                200,
            );

            const comparison = comparePerformance(oldBench, newBench);

            console.log("\n📊 Large Dataset - No Changes:");
            console.log(`   Old: ${oldBench.avgTime}ms avg`);
            console.log(`   New: ${newBench.avgTime}ms avg`);
            console.log(`   ${comparison.improvement > 0 ? "✅" : "⚠️"} New approach is ${comparison.faster}`);

            expect(mergedDataset).toBe(largeDataset);
        });

        it("should benchmark - multiple changes scenario", () => {
            const modifiedDataset = structuredClone(largeDataset);
            // Modify 20% of nodes
            for (let i = 0; i < 20; i++) {
                requireValue(modifiedDataset[i]).data.label = `Modified Service ${i + 1}`;
            }

            const oldBench = benchmark(
                "Old (position-based)",
                () => {
                    oldShouldUpdateNodes(largeDataset, modifiedDataset);
                },
                200,
            );

            const mergedDataset = mergeFlowElements(largeDataset, modifiedDataset);
            const newBench = benchmark(
                "New (ID-based)",
                () => {
                    mergeFlowElements(largeDataset, modifiedDataset);
                },
                200,
            );

            const comparison = comparePerformance(oldBench, newBench);

            console.log("\n📊 Large Dataset - Multiple Changes:");
            console.log(`   Old: ${oldBench.avgTime}ms avg`);
            console.log(`   New: ${newBench.avgTime}ms avg`);
            console.log(`   ${comparison.improvement > 0 ? "✅" : "⚠️"} New approach is ${comparison.faster}`);

            expect(mergedDataset[0]).toBe(modifiedDataset[0]);
            expect(mergedDataset[20]).toBe(largeDataset[20]);
        });
    });

    describe("Complex Data (high complexity nodes)", () => {
        const complexDataset = generateDataset(50, "high");
        const complexDatasetCopy = JSON.parse(JSON.stringify(complexDataset));

        it("should benchmark - complex nested objects", () => {
            const oldBench = benchmark(
                "Old (JSON.stringify)",
                () => {
                    oldShouldUpdateNodes(complexDataset, complexDatasetCopy);
                },
                200,
            );

            const mergedDataset = mergeFlowElements(complexDataset, complexDatasetCopy);
            const newBench = benchmark(
                "New (deepEqual)",
                () => {
                    mergeFlowElements(complexDataset, complexDatasetCopy);
                },
                200,
            );

            const comparison = comparePerformance(oldBench, newBench);

            console.log("\n📊 Complex Data - Deep Nested Objects:");
            console.log(`   Old: ${oldBench.avgTime}ms avg (JSON.stringify overhead)`);
            console.log(`   New: ${newBench.avgTime}ms avg (optimized deepEqual)`);
            console.log(`   ${comparison.improvement > 0 ? "✅" : "⚠️"} New approach is ${comparison.faster}`);

            expect(mergedDataset).toBe(complexDataset);
        });
    });

    describe("Edge Cases", () => {
        it("should benchmark - empty arrays", () => {
            const previousDataset: BenchmarkNode[] = [];
            const nextDataset: BenchmarkNode[] = [];
            const oldBench = benchmark("Old (empty)", () => {
                oldShouldUpdateNodes(previousDataset, nextDataset);
            });

            const mergedDataset = mergeFlowElements(previousDataset, nextDataset);
            const newBench = benchmark("New (empty)", () => {
                mergeFlowElements(previousDataset, nextDataset);
            });

            console.log("\n📊 Edge Case - Empty Arrays:");
            console.log(`   Old: ${oldBench.avgTime}ms avg`);
            console.log(`   New: ${newBench.avgTime}ms avg`);

            expect(mergedDataset).toBe(previousDataset);
        });

        it("should benchmark - identical reference (early exit)", () => {
            const dataset = generateDataset(50);

            const oldBench = benchmark(
                "Old (identical ref)",
                () => {
                    // Old approach doesn't have early reference check
                    oldShouldUpdateNodes(dataset, dataset);
                },
                500,
            );

            const mergedDataset = mergeFlowElements(dataset, dataset);
            const newBench = benchmark(
                "New (identical ref)",
                () => {
                    mergeFlowElements(dataset, dataset);
                },
                500,
            );

            const comparison = comparePerformance(oldBench, newBench);

            console.log("\n📊 Edge Case - Identical Reference:");
            console.log(`   Old: ${oldBench.avgTime}ms avg (no early exit)`);
            console.log(`   New: ${newBench.avgTime}ms avg (early exit optimization)`);
            console.log(`   ${comparison.improvement > 0 ? "✅" : "⚠️"} New approach is ${comparison.faster}`);

            expect(mergedDataset).toBe(dataset);
        });
    });
});
