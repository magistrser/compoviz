## Context

The builder currently renders every dependency edge in one pink color and places a shortened Compose condition in a floating label over the routed path. The normalized AST already supplies one of the three supported conditions to each edge. The Connection Types panel currently has a single Depends On entry, so removing the path labels requires the legend to carry the subtype explanation.

## Goals / Non-Goals

**Goals:**

- Make dense dependency graphs easier to scan by removing labels from dependency paths.
- Preserve all three dependency-condition meanings through distinct but coordinated colors.
- Keep edge rendering and the legend synchronized from one typed visual configuration.
- Present the dependency subtypes as a clear group without obscuring Network and Volume entries.

**Non-Goals:**

- Changing dependency parsing, defaults, graph direction, routing, or editing behavior.
- Changing Network or Volume edge semantics.
- Adding a user-selectable theme or palette.

## Decisions

### Use a shared typed dependency-condition palette

A small module beside the custom edge components will map every `DependencyCondition` to a human-readable label and stroke color. Both `DependsOnEdge` and `VisualBuilder` will consume this mapping so the legend cannot silently drift from the canvas. Unknown or absent edge data will fall back to `service_started`, matching the current behavior.

This is preferred over duplicating CSS classes because the edge stroke is supplied through React Flow's edge style while the legend is ordinary HTML. A shared TypeScript value gives both renderers the same source of truth.

### Encode subtypes with related hues and no inline labels

The existing pink remains the Started color. Healthy and Completed Successfully use nearby violet and indigo hues that remain visible on the dark canvas and are distinguishable from the cyan Network and amber Volume lines. Selected edges retain their wider stroke, so selection does not depend on color.

Removing the floating dependency label avoids collisions with nodes, other wires, and labels. Volume mount-path labels remain because they carry per-edge data that is not represented by a small fixed legend.

### Group dependency swatches in the Connection Types panel

The legend will show Depends On as a group heading followed by Started, Healthy, and Completed Successfully swatches. A subtle divider separates this group from the existing Network and Volume rows. The arrangement uses compact semantic list markup and the existing dark-surface visual language.

## Risks / Trade-offs

- **Color alone is not sufficient for every viewer** → The persistent legend pairs each hue with text, and existing routing/selection cues remain intact.
- **The larger legend occupies more canvas space** → Use compact rows, restrained spacing, and a modest fixed swatch width.
- **Future Compose conditions could be omitted from the legend** → Keep the palette typed against `DependencyCondition`; TypeScript and focused tests cover all currently supported conditions.
