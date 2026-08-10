/**
 * Canonical Compose AST Layer
 *
 * This module is the single entry point for the internal model layer.
 *
 * Usage:
 *   import { normalizeToAST, getServicesByTier, exportToCompose } from '../models';
 */

// Type definitions and constants
export { ASTNodeTypes, ServiceTiers, ServiceRoles, MountTypes, DependencyConditions, AST_VERSION } from "./ComposeAST";
export type {
    ASTNodeType,
    BuildInfo,
    ComposeAST,
    ConfigNode,
    Dependency,
    DependencyCondition,
    DeployConfig,
    Healthcheck,
    MountType,
    NetworkAttachment,
    NetworkNode,
    PersistenceMount,
    PortBinding,
    RawComposeObject,
    ResourceSpec,
    RuntimeMetadata,
    SecretNode,
    ServiceClassification,
    ServiceNode,
    ServiceRole,
    ServiceTier,
    StringMap,
    VolumeNode,
} from "./ComposeAST";
export type {
    ComposeAction,
    ComposeContextValue,
    ComposeDispatch,
    ComposeProviderProps,
    ComposeResource,
    ComposeService,
    ComposeState,
    LoadFilesOverrides,
    LoadFilesResult,
    ParseComposeResult,
    ParserIssue,
    ParserOptions,
    Position,
    Suggestion,
    SuggestionAction,
    SuggestionCategoryValue,
    SuggestionSeverityValue,
    ValidationIssue,
} from "./composeTypes";

// Normalization (raw compose → AST)
export { normalizeToAST } from "./normalizeToAST";

// Query utilities (read from AST)
export {
    getServicesByTier,
    getServicesByRole,
    getEffectiveImage,
    getEffectivePorts,
    getDependents,
    getDependencies,
    hasHealthcheck,
    hasResourceLimits,
    getServicesOnNetwork,
    getPrimaryNetwork,
    getOrphanedNetworks,
    getServicesUsingVolume,
    getOrphanedVolumes,
    getBindMounts,
    getAllHostBindings,
    getPortConflicts,
    getDependencyGraph,
    detectCycles,
    getTopologicalOrder,
    getServicesUsingSecret,
    getServicesUsingConfig,
} from "./astQueries";

// Export (AST → raw compose for serialization)
export { exportToCompose } from "./astExport";
