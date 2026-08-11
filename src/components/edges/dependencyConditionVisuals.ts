import { DependencyConditions, type DependencyCondition } from "../../models";

export interface DependencyConditionVisual {
    condition: DependencyCondition;
    label: string;
    color: string;
}

const startedDependency = {
    condition: DependencyConditions.STARTED,
    label: "Started",
    color: "#E06C9A",
} satisfies DependencyConditionVisual;

const healthyDependency = {
    condition: DependencyConditions.HEALTHY,
    label: "Healthy",
    color: "#C084FC",
} satisfies DependencyConditionVisual;

const completedDependency = {
    condition: DependencyConditions.COMPLETED,
    label: "Completed successfully",
    color: "#818CF8",
} satisfies DependencyConditionVisual;

export const DEPENDENCY_CONDITION_VISUALS: readonly DependencyConditionVisual[] = Object.freeze([
    startedDependency,
    healthyDependency,
    completedDependency,
]);

export function getDependencyConditionVisual(condition?: string): DependencyConditionVisual {
    switch (condition) {
        case DependencyConditions.HEALTHY:
            return healthyDependency;
        case DependencyConditions.COMPLETED:
            return completedDependency;
        default:
            return startedDependency;
    }
}
