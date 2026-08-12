## Context

The Build view currently converts normalized Compose services, networks, volumes, secrets, and configs into React Flow nodes, but creates edges only for dependencies, networks, and named volumes. `SecretNode` and `ConfigNode` expose hidden disabled handles, `ServiceNode` has no matching inputs, and the connection and edge-deletion classifiers recognize only the three existing relationship types. The routing geometry likewise assigns lanes only to dependency, network, and volume edges.

The normalized AST already exposes the source name of short-form and long-form service secret/config references, which is enough to derive an edge. The canonical Compose state retains the original reference arrays and therefore remains the correct layer for mutations that must preserve long-form attributes and unknown extension data. Relationship edits already pass through one domain transition boundary and one undo/redo history entry.

This change must retain the existing click-click interaction, directional output/input convention, deterministic cleanup, obstacle-aware orthogonal routing, strict TypeScript boundaries, and browser-only architecture. Secret content must never be copied into edge or terminal data.

## Goals / Non-Goals

**Goals:**

- Make every valid service secret/config reference visible and editable as a Build relationship.
- Reuse the accessible two-click terminal interaction in either endpoint order.
- Make connect, disconnect, undo, and redo lossless for unaffected short-form and long-form references.
- Give both relationship types dedicated terminals, routing lanes, semantic visuals, legend entries, and regression coverage.
- Keep deterministic layout and obstacle avoidance valid with the additional edges and lane offsets.

**Non-Goals:**

- Add a visual editor for long-form `target`, `uid`, `gid`, or `mode` attributes; those can continue to be authored through YAML.
- Display secret values, config contents, or resource source paths on relationship edges.
- Change Docker Compose runtime behavior or materialize files in the browser.
- Change the static View diagram's existing secret/config representation.
- Bundle shared secret/config routes or redesign the general Build node layout algorithm.

## Decisions

### Model both relationships as supporting-resource inputs

A secret or config node is the relationship source and the consuming service is the target, matching the existing network and named-volume direction:

```text
secret/config right-side output ─────▶ matching service left-side input
```

The alternative—drawing from service to resource to mirror the static Graphviz view—would conflict with Build's established “supporting resource feeds service” convention and reverse layout ranks for otherwise equivalent inputs.

`SecretNode` and `ConfigNode` will receive accessible `BuilderHandle` outputs with stable handle ids. `ServiceNode` will receive matching inputs. The five service inputs will occupy `25%`, `37.5%`, `50%`, `62.5%`, and `75%`; the dependency output moves with its input so dependency lines remain horizontally aligned.

### Extend the domain relationship union and mutate reference arrays losslessly

`ComposeRelationshipChange` and the compatibility classifiers will add `secret` and `config` variants. The transition layer will validate the service and the correctly typed top-level resource before applying an edit.

A small typed reference helper will identify a reference source without normalizing the full array:

- a string entry's source is the string;
- a long-form entry's source is its `source` property;
- entries whose source cannot be identified remain opaque and untouched.

Connecting appends a short-form name only if no identifiable entry already has that source. Disconnecting removes the identifiable matching entry. Every other array item is returned in its existing order and representation, retaining known and unknown object attributes. A duplicate connect is therefore unchanged, and a disconnect supports both short and long syntax without downgrading siblings.

Normalizing every reference to a string list was rejected because it would silently discard mount targets, ownership, permissions, and future Compose attributes. Adding long-form attributes to the connection action was also rejected because drawing a relationship only expresses resource consumption, not container placement details.

### Derive edges from the normalized AST and mutate through canonical state

`stateToFlow` will create a stable edge for each normalized service secret/config source that resolves to a top-level resource in the AST. Short and long syntax therefore render identically, while undefined references do not produce dangling React Flow endpoints. Edge ids and types will encode the relationship kind so edge deletion can map back to one domain disconnect intent.

The normalized AST is deliberately used only for reading the graph. Canvas actions continue to commit against canonical Compose state through the compose-editing boundary; React Flow state never becomes a second source of truth.

### Add semantic edge types without exposing resource data

Secret and config edges will use the shared orthogonal path engine and standard selection emphasis. They will have separate semantic types/styles: purple dotted secret connections and cyan dotted config connections. The components receive only routing metadata and resource identities required by React Flow; file paths, inline content, and external resource details are excluded.

The Connection Types legend will add both keys. Reusing the volume edge type was rejected because it would give the relationships the wrong semantics and invite volume-only labels such as mount paths.

### Extend routing geometry and deterministic cleanup

The routing-lane type and offset table will add stable secret and config lanes. Rank separation remains derived from the longest lead, so adding lanes automatically reserves enough horizontal space rather than embedding a second spacing constant. Each new edge participates in Dagre ranking and vertical-lane compaction like every other edge, placing acyclic supporting resources before consuming services.

Obstacle routing, terminal-center anchoring, rerouting after node movement, and selected-edge emphasis remain shared behaviors. Network-only bundling remains network-only.

### Reuse existing connection and deletion flows

`relationshipForConnection`, compatibility highlighting, and `relationshipForEdge` will recognize the two exact new handle pairs. A valid second click commits immediately without a popup; only dependencies require a condition choice. Selecting and deleting an edge submits a disconnect change, and deleting several supported edges remains one batched relationship edit and one history transition.

## Risks / Trade-offs

- **[Risk] Five inputs make the service edge visually denser.** → Keep the existing `12.5%` rhythm, center the five inputs, use relationship-specific colors, and cover terminal positioning at the component seam.
- **[Risk] Additional routing lanes increase horizontal layout spacing.** → Continue deriving rank separation from the maximum configured lane and verify deterministic, non-overlapping output in layout tests.
- **[Risk] Reference mutation could erase long-form or unknown data.** → Match only by identifiable source, preserve unmatched entries by identity/order, and test mixed short/long arrays with unknown attributes.
- **[Risk] A secret edge could accidentally expose sensitive data.** → Put only source identities and routing data into flow edges; never add secret contents, file paths, or config contents to labels or edge data.
- **[Risk] Similar cyan network/config visuals may be difficult to distinguish.** → Use distinct color values and dash patterns and document both in the legend; verify rendered edge styles independently.

## Migration Plan

No persisted-state migration is required. Existing short-form and long-form Compose references will begin producing Build edges after the new converter and edge types load. The implementation can be rolled back without changing stored Compose documents because new canvas actions serialize standard Compose references only.

## Open Questions

None. Advanced long-form attribute editing remains explicitly outside this change.
