/**
 * Error help content - provides context and solutions for each error type
 * Used by validation error displays throughout the app
 */
export interface ErrorHelp {
    explanation: string;
    solution: string;
}

export const ERROR_HELP: Record<string, ErrorHelp> = {
    "Missing image or build context": {
        explanation:
            "Every Docker service needs either a pre-built image from a registry or a build context to create one.",
        solution: 'Add an image name (e.g., "nginx:latest") OR specify a build context path (e.g., "./app").',
    },
    "Network .* not defined": {
        explanation: "This service references a network that doesn't exist in your compose file.",
        solution: "Create the missing network in the Networks section, or remove this network reference.",
    },
    "Dependency .* not found": {
        explanation: "This service depends on another service that doesn't exist.",
        solution: "Create the missing service, or remove this dependency.",
    },
    "Volume .* not defined": {
        explanation: "This service uses a named volume that isn't declared in the volumes section.",
        solution: "Add the volume to the Volumes section, or use a bind mount path instead.",
    },
    "Port .* already used": {
        explanation: "Multiple services are trying to bind to the same host port, which will cause a conflict.",
        solution: "Change one of the services to use a different host port (the number before the colon).",
    },
    "Duplicate container_name": {
        explanation: "Container names must be unique. Two services have the same container_name.",
        solution: "Change the container_name to be unique, or remove it to use auto-generated names.",
    },
};

/**
 * Get help content for an error message
 * @param {string} message - The error message to get help for
 * @returns {{ explanation: string, solution: string }}
 */
export const getErrorHelp = (message: string): ErrorHelp => {
    for (const [pattern, help] of Object.entries(ERROR_HELP)) {
        if (new RegExp(pattern, "i").test(message)) {
            return help;
        }
    }
    return { explanation: "This configuration may cause issues.", solution: "Review and correct the value." };
};
