## Why

Builder relationships currently rely on each node component and the layout engine independently agreeing about connection direction. The canvas needs one explicit invariant: every incoming line terminates on the consuming resource's left side and every outgoing line starts on the providing resource's right side. Networks, volumes, and other supporting resources provide inputs to services, so their lines must run from the resource into the service. `Clean layout` must arrange the graph around that invariant so the result remains readable.

## What Changes

- Make left-side inputs and right-side outputs an explicit contract for every builder resource type and relationship.
- Represent network and named-volume relationships as resource-to-service flows: supporting resources expose right-side outputs and services expose the corresponding left-side inputs.
- Preserve relationship-specific terminals while exposing their direction consistently to React Flow and custom edge routing.
- Make `Clean layout` use the directed connection model when ranking resources, keep connected source/target ranks separated enough for their terminal leads, and remain deterministic for cycles and disconnected resources.
- Add regression coverage for node terminal direction and cleaned layouts across service, network, volume, and other resource nodes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `architecture-visualization`: Require directional builder terminals and a cleanup layout that keeps directed connections readable under that rule.

## Impact

- Builder flow conversion and resource node components.
- Deterministic builder layout and its regression tests.
- Builder interaction tests and the architecture visualization specification.
- No Compose semantics, persisted position schema, public API, or dependency changes; only the builder's visual relationship direction changes.
