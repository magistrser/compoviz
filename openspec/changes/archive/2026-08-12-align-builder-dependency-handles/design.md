## Context

Service nodes expose three left-side relationship inputs and one right-side dependency output. The dependency input uses a `25%` vertical offset, while the dependency output uses `50%`, making the matching pink terminals appear on different horizontal lines.

Builder nodes also animate from `scale(0.9)` to `scale(1)`. React Flow measures terminal bounds during the scaled frame and retains those coordinates after the visual dots reach full size, so edge endpoints extend past the final dot centers into the nodes.

## Goals / Non-Goals

**Goals:**

- Horizontally align the dependency input and output terminals on every service node.
- Keep network and volume inputs on distinct vertical lanes with half the original spacing.
- Lock the geometry with focused component coverage and rendered-browser verification.
- Keep relationship endpoints anchored to the final rendered dot centers.

**Non-Goals:**

- Changing terminal sides, edge routing, node sizing, or relationship semantics.
- Aligning terminals that represent different relationship types.

## Decisions

- Center the three service inputs at `37.5%`, `50%`, and `62.5%`. This halves the adjacent gap from `25` to `12.5` percentage points without shifting the group midpoint, and the dependency output follows the dependency input at `37.5%`.
- Assert inline handle offsets through the existing mocked `Handle` component. This is more focused and stable than inferring styles from the full canvas.
- Keep the node entrance effect opacity-only. Transforming a shell that contains React Flow handles invalidates the library's initial geometry measurement; compensating in the router would couple path math to animation scale and handle size.

## Risks / Trade-offs

- [Existing dependency edges start slightly higher on service nodes] → Browser-check a representative builder graph and retain all routing inputs and sides unchanged.
- [The entrance effect no longer scales nodes] → Retain the fade-in while prioritizing stable connection geometry.
