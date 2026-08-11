## 1. Dependency Editing Domain

- [x] 1.1 Add compose-editing regression tests for creating and changing all supported dependency conditions, preserving mixed sibling configurations, compacting simple Started dependencies, unchanged confirmation, and one-step undo.
- [x] 1.2 Refine relationship edit types to carry typed dependency conditions and implement lossless condition-aware `depends_on` transitions.

## 2. Accessible Condition Choice

- [x] 2.1 Add popup tests for an initially selected choice, confirmed and cancelled results, keyboard focus containment, Escape handling, and trigger-focus restoration.
- [x] 2.2 Extend the popup boundary with a reusable accessible choice popup that can display dependency labels and color swatches.

## 3. Visual Builder Interaction

- [x] 3.1 Add builder tests for choosing or cancelling a condition after drawing a dependency, bypassing the chooser for network and volume links, and preselecting the current condition when editing an existing edge.
- [x] 3.2 Prompt before committing newly drawn dependency edges and pass the confirmed typed condition through the editing boundary.
- [x] 3.3 Open the condition chooser on dependency-edge double-click and on Enter for a selected dependency edge, while preserving ordinary selection, deletion, and non-dependency edge behavior.
- [x] 3.4 Verify confirmed condition changes update generated YAML and the rendered edge color without an intermediate or duplicate history transition.

## 4. Validation

- [x] 4.1 Run the focused popup, compose-editing, edge, and VisualBuilder test suites and resolve regressions.
- [x] 4.2 Run formatting, lint, TypeScript checks, the full test suite, and the production build.
- [x] 4.3 Run strict OpenSpec validation for `edit-dependency-conditions` and keep the implemented behavior synchronized with the change artifacts.
