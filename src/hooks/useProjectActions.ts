import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { ResourceSelection, ResourceType } from "../context/UIContext";
import type { ComposeAction, ComposeDispatch, ComposeResource, ComposeService } from "../models/composeTypes";
import type { ServiceTemplate } from "../data/templates";
import { usePopup } from "../components/ui";

type ResourceData = Partial<ComposeService> | Partial<ComposeResource>;

function actionForResource(operation: "ADD" | "DELETE", type: ResourceType, name: string): ComposeAction {
    switch (`${operation}_${type}`) {
        case "ADD_services":
            return { type: "ADD_SERVICE", name };
        case "DELETE_services":
            return { type: "DELETE_SERVICE", name };
        case "ADD_networks":
            return { type: "ADD_NETWORK", name };
        case "DELETE_networks":
            return { type: "DELETE_NETWORK", name };
        case "ADD_volumes":
            return { type: "ADD_VOLUME", name };
        case "DELETE_volumes":
            return { type: "DELETE_VOLUME", name };
        case "ADD_secrets":
            return { type: "ADD_SECRET", name };
        case "DELETE_secrets":
            return { type: "DELETE_SECRET", name };
        case "ADD_configs":
            return { type: "ADD_CONFIG", name };
        default:
            return { type: "DELETE_CONFIG", name };
    }
}

function updateAction(selection: ResourceSelection, data: ResourceData): ComposeAction {
    switch (selection.type) {
        case "services":
            return { type: "UPDATE_SERVICE", name: selection.name, data };
        case "networks":
            return { type: "UPDATE_NETWORK", name: selection.name, data };
        case "volumes":
            return { type: "UPDATE_VOLUME", name: selection.name, data };
        case "secrets":
            return { type: "UPDATE_SECRET", name: selection.name, data };
        case "configs":
            return { type: "UPDATE_CONFIG", name: selection.name, data };
    }
}

export function useProjectActions(
    dispatch: ComposeDispatch,
    selected: ResourceSelection | null,
    setSelected: Dispatch<SetStateAction<ResourceSelection | null>>,
    setShowTemplates: Dispatch<SetStateAction<boolean>>,
    resetProject: () => void,
) {
    const popup = usePopup();

    const handleAdd = async (type: ResourceType) => {
        const singularType = type.slice(0, -1);
        const displayType = `${singularType.charAt(0).toUpperCase()}${singularType.slice(1)}`;
        const name = await popup.requestText({
            title: `Add ${singularType}`,
            description: `Choose a name for the new ${singularType}.`,
            label: `${displayType} name`,
            confirmLabel: "Add",
        });
        if (!name) return;
        dispatch(actionForResource("ADD", type, name));
        setSelected({ type, name });
    };

    const handleAddFromTemplate = (templateName: string, serviceTemplates: Record<string, ServiceTemplate>) => {
        const template = serviceTemplates[templateName];
        if (!template) return;
        const serviceName = template.name || templateName;
        dispatch({ type: "ADD_SERVICE", name: serviceName });
        dispatch({ type: "UPDATE_SERVICE", name: serviceName, data: template.config });
        if (template.suggestedVolume) {
            dispatch({ type: "ADD_VOLUME", name: template.suggestedVolume.name });
            dispatch({
                type: "UPDATE_VOLUME",
                name: template.suggestedVolume.name,
                data: template.suggestedVolume.config,
            });
        }
        setSelected({ type: "services", name: serviceName });
        setShowTemplates(false);
    };

    const handleDelete = async (type: ResourceType, name: string) => {
        const confirmed = await popup.requestConfirmation({
            title: `Delete ${name}?`,
            description: "This action cannot be undone.",
            confirmLabel: "Delete",
            tone: "danger",
        });
        if (!confirmed) return;
        dispatch(actionForResource("DELETE", type, name));
        if (selected?.name === name) setSelected(null);
    };

    const handleUpdate = useCallback(
        (data: ResourceData) => {
            if (selected) dispatch(updateAction(selected, data));
        },
        [dispatch, selected],
    );

    const handleClearAll = async () => {
        const confirmed = await popup.requestConfirmation({
            title: "Clear all configuration?",
            description: "This action cannot be undone.",
            confirmLabel: "Clear all",
            tone: "danger",
        });
        if (!confirmed) return;

        resetProject();
        setSelected(null);
    };

    return {
        handleAdd,
        handleAddFromTemplate,
        handleDelete,
        handleUpdate,
        handleClearAll,
    };
}
