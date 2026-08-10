/**
 * Docker Compose variable interpolator.
 * Handles ${VAR} syntax with defaults, escaping, and metadata tracking.
 */

// Parsing logic replaced with custom implementation to avoid Node.js 'fs'/'path' dependencies
// import dotenv from 'dotenv';

/**
 * Variable regex - matches ${VAR} but not $${VAR} (escaped)
 * Uses negative lookbehind to avoid matching escaped variables
 */
const VARIABLE_REGEX = /(?<!\$)\$\{([^}]+)\}/g;

/**
 * Parse .env file content manually (browser-compatible).
 * Handles basic KEY=VALUE format, comments, and quotes.
 *
 * @param {string} content - .env file content
 * @returns {Object} Parsed environment variables
 */
export function parseEnvFile(content: string | null | undefined): Record<string, string> {
    if (!content) return {};

    const env: Record<string, string> = {};
    const lines = content.split("\n");

    for (let line of lines) {
        // Trim whitespace
        line = line.trim();

        // Skip empty lines and comments
        if (!line || line.startsWith("#")) continue;

        // Parse KEY=VALUE
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1]?.trim();
            let value = match[2]?.trim() ?? "";
            if (!key) continue;
            let wasQuoted = false;

            // Handle double quotes
            if (value.startsWith('"') && value.endsWith('"')) {
                wasQuoted = true;
                value = value.slice(1, -1);
                // Expand newlines in quoted strings
                value = value.replace(/\\n/g, "\n");
            }
            // Handle single quotes
            else if (value.startsWith("'") && value.endsWith("'")) {
                wasQuoted = true;
                value = value.slice(1, -1);
            }

            // Remove inline comments if not quoted (simplistic approach)
            // Note: This is a simplified parser; complex shell-like quoting might vary
            if (!wasQuoted && value.includes(" #")) {
                value = value.split(" #")[0]?.trim() ?? "";
            }

            env[key] = value;
        }
    }

    return env;
}

/**
 * Merge multiple environment sources with precedence.
 * Later sources override earlier ones.
 *
 * @param {...Object} sources - Environment variable objects
 * @returns {Object} Merged environment
 */
export function mergeEnv(...sources: Array<Record<string, string>>): Record<string, string> {
    return Object.assign({}, ...sources);
}

/**
 * Substitute a single variable reference.
 * Supports:
 * - ${VAR} - Simple substitution
 * - ${VAR:-default} - Default if unset or empty
 * - ${VAR-default} - Default if unset only
 * - ${VAR:?error} - Required variable with error message
 *
 * @param {string} match - The full match (e.g., "${PORT:-8080}")
 * @param {string} expression - The content inside ${} (e.g., "PORT:-8080")
 * @param {Object} env - Environment variables
 * @returns {string} Substituted value
 */
function substituteVariable(expression: string, env: Record<string, string>): string {
    // Parse the expression
    let varName = "";
    let defaultValue: string | undefined;
    let errorMessage: string | undefined;
    let requireSet = false;
    let requireNonEmpty = false;

    // ${VAR:?error message}
    if (expression.includes(":?")) {
        const parts = expression.split(":?");
        varName = parts[0] ?? "";
        errorMessage = parts[1];
        requireNonEmpty = true;
    }
    // ${VAR?error message}
    else if (expression.includes("?") && !expression.includes(":-") && !expression.includes("-")) {
        const parts = expression.split("?");
        varName = parts[0] ?? "";
        errorMessage = parts[1];
        requireSet = true;
    }
    // ${VAR:-default}
    else if (expression.includes(":-")) {
        const parts = expression.split(":-");
        varName = parts[0] ?? "";
        defaultValue = parts[1];
        requireNonEmpty = true;
    }
    // ${VAR-default}
    else if (expression.includes("-")) {
        const parts = expression.split("-");
        varName = parts[0] ?? "";
        defaultValue = parts[1];
        requireSet = true;
    }
    // ${VAR}
    else {
        varName = expression;
    }

    const value = env[varName];
    const isSet = value !== undefined && value !== null;
    const isEmpty = !isSet || value === "";

    // Handle required variables WITH error messages (these throw)
    if (errorMessage) {
        if (requireNonEmpty && isEmpty) {
            throw new Error(errorMessage);
        }
        if (requireSet && !isSet) {
            throw new Error(errorMessage);
        }
    }

    // Handle variables with default values (no errors, just return default)
    if (defaultValue !== undefined) {
        if (requireNonEmpty && isEmpty) {
            return defaultValue;
        }
        if (requireSet && !isSet) {
            return defaultValue;
        }
    }

    // Simple ${VAR} or value is set
    return isSet ? String(value) : "";
}

/**
 * Interpolate variables in a string value.
 * Preserves original value metadata for UI display.
 *
 * @param {string} str - String to interpolate
 * @param {Object} env - Environment variables
 * @returns {{original: string, resolved: string, hasVariable: boolean, variables: string[]}} Interpolation result
 */
interface InterpolationErrorContext {
    match: string;
    expression: string;
    varName: string;
}

interface InterpolationOptions {
    throwOnError?: boolean;
    onError?: (error: Error, context: InterpolationErrorContext) => void;
}

export interface InterpolatedString {
    original: string;
    resolved: string;
    hasVariable: boolean;
    variables: string[];
}

function interpolateString(
    str: string,
    env: Record<string, string>,
    options: InterpolationOptions = {},
): InterpolatedString {
    const variables: string[] = [];
    let hasVariable = false;
    const { throwOnError = true, onError } = options;

    // First unescape $$ to handle cases like $$${VAR}
    const preprocessed = str.replace(/\$\$/g, "\x00ESCAPED_DOLLAR\x00");

    // Replace variables
    const resolved = preprocessed.replace(VARIABLE_REGEX, (match, expression) => {
        hasVariable = true;
        // Extract variable name (before :- or -)
        const varName = expression.split(/[:-?]/)[0] ?? "";
        if (!variables.includes(varName)) {
            variables.push(varName);
        }
        try {
            return substituteVariable(expression, env);
        } catch (error) {
            const interpolationError = error instanceof Error ? error : new Error(String(error));
            if (onError) {
                onError(interpolationError, { match, expression, varName });
            }
            if (throwOnError) {
                throw interpolationError;
            }
            return match;
        }
    });

    // Restore escaped dollars
    const ESCAPED_DOLLAR_PLACEHOLDER = "\x00ESCAPED_DOLLAR\x00";
    const unescaped = resolved.replace(new RegExp(ESCAPED_DOLLAR_PLACEHOLDER, "g"), "$");

    return {
        original: str,
        resolved: unescaped,
        hasVariable,
        variables,
    };
}

/**
 * Recursively interpolate variables in a value (string, object, or array).
 *
 * @param {any} value - Value to interpolate
 * @param {Object} env - Environment variables
 * @param {boolean} addMetadata - Whether to add _original, _resolved metadata
 * @returns {any} Interpolated value
 */
export function interpolate(
    value: unknown,
    env: Record<string, string>,
    addMetadata = true,
    options: InterpolationOptions = {},
): unknown {
    if (value === null || value === undefined) {
        return value;
    }

    if (typeof value === "string") {
        const result = interpolateString(value, env, options);

        // For strings with variables, optionally preserve metadata
        if (addMetadata && result.hasVariable) {
            // Return an object with metadata (UI can detect this)
            return {
                _value: result.resolved,
                _original: result.original,
                _hasVariable: true,
                _variables: result.variables,
            };
        }

        return result.resolved;
    }

    if (Array.isArray(value)) {
        return value.map((item) => interpolate(item, env, addMetadata, options));
    }

    if (typeof value === "object") {
        const result: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value)) {
            result[key] = interpolate(val, env, addMetadata, options);
        }
        return result;
    }

    return value;
}

/**
 * Extract all variable references from a compose configuration.
 *
 * @param {Object} compose - Compose configuration
 * @returns {Set<string>} Set of variable names
 */
export function extractVariables(compose: unknown): Set<string> {
    const variables = new Set<string>();

    function extract(value: unknown): void {
        if (typeof value === "string") {
            const matches = value.matchAll(VARIABLE_REGEX);
            for (const match of matches) {
                const expression = match[1];
                const varName = expression?.split(/[:-?]/)[0];
                if (varName) variables.add(varName);
            }
        } else if (Array.isArray(value)) {
            value.forEach(extract);
        } else if (value && typeof value === "object") {
            Object.values(value).forEach(extract);
        }
    }

    extract(compose);
    return variables;
}

/**
 * Get undefined variables in a compose configuration.
 *
 * @param {Object} compose - Compose configuration
 * @param {Object} env - Environment variables
 * @returns {string[]} Array of undefined variable names
 */
export function getUndefinedVariables(compose: unknown, env: Record<string, string>): string[] {
    const allVars = extractVariables(compose);
    const undefinedVars: string[] = [];

    for (const varName of allVars) {
        if (env[varName] === undefined || env[varName] === null) {
            undefinedVars.push(varName);
        }
    }

    return undefinedVars;
}
