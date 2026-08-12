## 1. Regression Coverage

- [x] 1.1 Extend custom-edge renderer tests to compare selected and unselected visible strokes for dependency, network, and volume relationships.
- [x] 1.2 Prove selected strokes are at least twice their normal width, use a color-matched glow, and retain semantic colors and dash patterns.

## 2. Edge Presentation

- [x] 2.1 Apply a consistent `4px` selected stroke to dependency, network, and volume renderers.
- [x] 2.2 Add the compact semantic-color glow without changing unselected presentation, routing, labels, or patterns.

## 3. Validation

- [x] 3.1 Run the focused renderer regression tests and strict OpenSpec validation.
- [x] 3.2 Run the project quality and production-build gates.
- [x] 3.3 Smoke-test selected and unselected relationships in the browser and inspect the console.
