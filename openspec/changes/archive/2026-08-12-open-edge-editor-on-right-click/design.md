## Context

`VisualBuilder` currently delegates dependency-edge double-clicks from React Flow to the existing condition popup, while selected dependency edges also support Enter. The popup and model-update path already work; only the pointer-event entry point needs to change.

## Goals / Non-Goals

**Goals:**

- Open the existing condition popup from a dependency edge's context-menu event.
- Prevent the native browser context menu for that handled edge interaction.
- Remove double-click as an editor-opening gesture while retaining keyboard access.

**Non-Goals:**

- Adding a custom multi-action context menu.
- Changing condition values, popup presentation, edge selection, deletion, or persistence.
- Adding edit behavior to network or volume edges.

## Decisions

- Use React Flow's edge context-menu callback because it directly represents a right-button action on an edge and provides the edge identity without DOM targeting.
- Call `preventDefault()` before opening the dependency editor so the browser menu does not obscure the in-application popup.
- Keep the existing Enter handler for keyboard parity. Remove the edge double-click callback rather than leaving two pointer gestures active.
- Cover both the new gesture and removal of the old gesture through the existing `VisualBuilder` interaction-test seam.

## Risks / Trade-offs

- **[Risk] Right-click normally opens the browser menu.** → Suppress it only on the handled dependency-edge callback.
- **[Risk] Non-dependency edges could unexpectedly become editable.** → Retain the existing dependency-edge guard before opening the popup.
