import type { ComposeAST } from "../../models/ComposeAST";
import type { ComparisonProject } from "./types";

export interface AdmittedComparisonProject {
    readonly project: ComparisonProject;
    readonly ast: ComposeAST;
}
