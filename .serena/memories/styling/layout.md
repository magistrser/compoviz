# Styling layout
- `src/styles/global.scss` contains Tailwind-derived utilities inside `@layer utilities` plus later unlayered component/base rules. Unlayered element selectors win the cascade; use a semantic unlayered selector when a control-specific utility (for example input padding) must override a generic unlayered rule.
- React Flow `MiniMap` and `Panel` instances using `bottom-right` receive the same 15px anchor. Give concurrent overlays distinct explicit offsets and restore the minimap's 15px anchor below the mobile breakpoint when the help legend is hidden.
- Service headers must keep icons/badges non-shrinking and give `.node-title` `min-width: 0` with ellipsis so long Compose resource names stay inside the fixed-width node.

- Builder dependency-condition visuals are centralized in `src/components/edges/dependencyConditionVisuals.ts`; the edge renderer and Connection Types legend share that palette, and dependency wires intentionally omit inline condition labels.
