## Context

The builder already declares left/right positions on its current React Flow handles, and Dagre already ranks ordinary directed edges from left to right. The rule is nevertheless duplicated across five node components, absent from the generated node metadata, and contradicted by the orthogonal router's bottom/top fallback. More importantly, the historical network and volume edges run from a service to a supporting resource even though those resources are inputs consumed by the service. Cleanup also carries a numeric rank gap without tying it to the space required by the longest relationship-specific terminal leads. Those gaps make the requested direction and resource-provider semantics fragile when a renderer lacks handle metadata or the layout configuration changes.

The existing public seams remain `stateToFlow` for generated nodes and edges, `layoutBuilderGraph` for cleanup placement, and the rendered resource nodes/orthogonal path helper for connection geometry.

## Goals / Non-Goals

**Goals:**

- Make every exposed builder input use the left side and every exposed builder output use the right side.
- Make networks and named volumes the sources of their relationships and services the targets that consume them.
- Apply the same direction to generated React Flow node metadata, rendered handles, and orthogonal-routing fallbacks.
- Make cleanup reserve enough horizontal rank space for the longest source and target lead lanes.
- Preserve deterministic placement, stable typed handles, obstacle avoidance, manual positioning, and atomic cleanup history.

**Non-Goals:**

- Add new Compose relationship kinds or implement secret/config relationship editing that the builder does not currently support.
- Change dependency semantics; service dependencies continue to flow from the depended-on service into the dependent service.
- Force every edge's source node to appear left of its target when a directed cycle makes that impossible.
- Change saved `_position` data, normal rendering of saved positions, or Graphviz diagrams.

## Decisions

### Centralize builder connection direction

Add one small builder-connection geometry module that exports the input position (`Left`), output position (`Right`), relationship lead distances, and the minimum rank separation derived from the longest lead. Generated nodes and every rendered `Handle` consume the same direction constants. Networks, volumes, and other supporting resource nodes expose their available output on the right; services expose dedicated network and volume inputs on the left alongside the dependency input, while retaining a right-side dependency output. This keeps the invariant visible at both the graph-data boundary and the DOM boundary.

The orthogonal path helper will use output-right/input-left as its fallback whenever React Flow omits explicit positions. Keeping bottom/top as a fallback was rejected because it silently violates the builder rule in partial renders and tests.

### Make supporting resources the relationship sources

Convert network and named-volume graph edges from resource nodes into service nodes, using stable `network-out`/`volume-out` source handles and matching `network-in`/`volume-in` service target handles. The builder's manual connect and delete mappings use the same resource-to-service interpretation. Edge IDs remain stable because they identify the Compose relationship rather than its visual endpoint order.

Dependency edges keep their existing depended-on-service to dependent-service direction. Secret and config nodes expose right-side outputs for consistency with their provider role, but this change does not add relationship kinds or editing support for them.

### Make cleanup terminal-aware while retaining Dagre

Continue using the pure deterministic Dagre adapter with `rankdir: "LR"`, but derive `ranksep` from twice the longest relationship lead plus a visible middle segment. Give valid directed relationships an explicit stable edge weight and minimum rank length. Nodes and edges remain sorted before insertion, so the same graph still produces the same coordinates.

When fitting the cleaned graph, reserve asymmetric viewport clearance for the persistent toolbar, Connection Types legend, help panel, and minimap. This keeps source resources at the outer ranks visible instead of allowing a valid Dagre position to be obscured by a canvas overlay.

Replacing Dagre or persisting bend points was rejected: placement already satisfies the builder's deterministic contract, while the defect is an unshared direction/gap invariant. Directed cycles continue to use Dagre's deterministic cycle breaking; the router can leave a right-side output and detour into a left-side input even for the back edge.

### Test the existing public seams

Flow-conversion tests assert direction metadata and resource-to-service edge endpoints. Rendered-node tests assert that service targets use the shared left position and supporting-resource sources use the shared right position. Builder interaction tests cover manually adding and removing a resource input. Layout tests assert that an acyclic graph places supporting resources before their consuming service with sufficient rank clearance, while cycle and input-order determinism remain covered. Orthogonal-path tests assert the shared fallback direction.

## Risks / Trade-offs

- **[Risk] Directed cycles necessarily contain a visually backward edge.** → Keep all terminals on the required sides, use deterministic cycle breaking, and let the obstacle-aware orthogonal router detour the back edge.
- **[Risk] Larger rank separation widens dense diagrams.** → Derive only the minimum gap needed by existing typed lead lanes and keep `fitView` after cleanup.
- **[Risk] Node metadata and custom handles could drift again.** → Share constants and cover both data and rendered seams.

## Migration Plan

No data migration is required. Deploy the shared geometry constants and cleanup configuration together; rollback restores the prior local constants and numeric rank separation without affecting saved positions.

## Open Questions

None.
