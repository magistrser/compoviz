import { memo, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type PropsWithChildren } from "react";
import { AlertTriangle, Info, Plus, Trash2, Upload, XCircle } from "lucide-react";
import { ProjectComparisonProvider, useProjectComparison } from "../features/project-comparison";
import { RenderedArchitectureDiagram } from "../features/diagram";
import { generateMultiProjectGraphviz } from "../utils/graphviz";
import { useToast } from "./ui";

function CompareViewContent() {
    const { snapshot, admit, remove, clear } = useProjectComparison();
    const { projects, findings, summary } = snapshot;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const toast = useToast();
    const conflicts = useMemo(() => findings.filter((finding) => finding.severity === "error"), [findings]);
    const dot = useMemo(() => generateMultiProjectGraphviz(projects, conflicts), [conflicts, projects]);

    const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(false);
    };

    const loadProjectFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (event: ProgressEvent<FileReader>) => {
            const content = event.target?.result;
            if (typeof content !== "string") {
                toast.error(`Failed to read ${file.name}`);
                return;
            }
            const result = admit({ yaml: content, importedFilename: file.name });
            if (result.status === "rejected" && result.reason === "capacity") {
                toast.warning("Maximum of 3 projects allowed. Please remove a project first.");
            } else if (result.status === "rejected") {
                toast.error(`Failed to parse ${file.name}: ${result.error}`);
            }
        };
        reader.onerror = () => toast.error(`Failed to read ${file.name}`);
        reader.readAsText(file);
    };

    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(false);
        const files = Array.from(event.dataTransfer.files).filter(
            (file) => file.name.endsWith(".yml") || file.name.endsWith(".yaml"),
        );
        if (files.length === 0) return;

        const available = 3 - projects.length;
        if (available <= 0) {
            toast.warning("Maximum of 3 projects allowed. Please remove a project first.");
            return;
        }
        files.slice(0, available).forEach(loadProjectFile);
    };

    const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            loadProjectFile(file);
            event.target.value = "";
        }
    };

    const analysisOverlay = (
        <>
            <div className="absolute top-6 left-6 bottom-20 z-20 w-80 flex flex-col max-h-[calc(100%-8rem)]">
                <div className="glass p-5 rounded-2xl border border-border/50 shadow-2xl animate-slide-in flex flex-col overflow-hidden max-h-full">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 flex-shrink-0">
                        Analysis Results
                        {conflicts.length > 0 ? (
                            <Badge type="error">{conflicts.length} Conflicts</Badge>
                        ) : (
                            <Badge type="success">No Conflicts</Badge>
                        )}
                    </h3>
                    <div className="flex-1 min-h-0 flex flex-col space-y-4">
                        <p className="text-sm text-text-secondary leading-relaxed">{summary}</p>
                        {findings.length > 0 && (
                            <div className="space-y-2 overflow-y-auto pr-2 flex-1 min-h-0">
                                {findings.map((finding, index) => (
                                    <div
                                        key={`${finding.category}-${index}`}
                                        className={`p-3 rounded-xl border text-xs flex gap-3 ${
                                            finding.severity === "error"
                                                ? "bg-error/10 border-error/30 text-error"
                                                : finding.severity === "warning"
                                                  ? "bg-warning/10 border-warning/30 text-warning"
                                                  : "bg-accent/10 border-accent/30 text-accent"
                                        }`}
                                    >
                                        {finding.severity === "error" ? (
                                            <XCircle
                                                size={14}
                                                className="shrink-0 mt-0.5"
                                            />
                                        ) : finding.severity === "warning" ? (
                                            <AlertTriangle
                                                size={14}
                                                className="shrink-0 mt-0.5"
                                            />
                                        ) : (
                                            <Info
                                                size={14}
                                                className="shrink-0 mt-0.5"
                                            />
                                        )}
                                        <div className="space-y-1">
                                            <p className="font-bold uppercase tracking-wider text-[10px] opacity-70">
                                                {finding.category}
                                            </p>
                                            <p className="font-medium leading-normal">{finding.message}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="absolute bottom-6 left-6 z-10 p-4 glass rounded-xl border border-border/50 text-xs text-text-secondary select-none pointer-events-none shadow-lg">
                💡 Drag to pan • Scroll wheel to zoom • Use buttons for precise control
            </div>
        </>
    );

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 pb-4 bg-surface border-b border-border/50 shadow-lg z-10">
                <div className="w-full px-6 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        {projects.map((project) => (
                            <div
                                key={project.id}
                                className="group relative flex items-center gap-2 px-3 py-1.5 glass rounded-lg border border-accent/30 hover:border-accent transition-all"
                            >
                                <span className="text-sm font-medium truncate max-w-[120px]">{project.name}</span>
                                <button
                                    type="button"
                                    onClick={() => remove(project.id)}
                                    className="text-text-secondary hover:text-error transition-colors"
                                    aria-label={`Remove ${project.name}`}
                                >
                                    <XCircle size={14} />
                                </button>
                            </div>
                        ))}
                        {projects.length < 3 && (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-1.5 rounded-lg border border-dashed border-accent/30 text-accent hover:bg-accent/10 transition-all flex items-center gap-2"
                                title="Add Project"
                            >
                                <Plus size={16} />
                                <span className="text-xs font-semibold uppercase tracking-wider pr-1">Add Project</span>
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {projects.length > 0 && (
                            <button
                                type="button"
                                onClick={clear}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-text-secondary hover:text-error hover:bg-error/10 transition-all"
                            >
                                <Trash2 size={16} />
                                Clear All
                            </button>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept=".yml,.yaml"
                            className="hidden"
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
                {projects.length < 2 ? (
                    <div
                        className={`h-full flex flex-col items-center justify-center p-8 transition-all ${isDragging ? "bg-accent/5" : ""}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <div className="max-w-lg w-full text-center space-y-6">
                            <div className="relative group mx-auto w-24 h-24 mb-6">
                                <div className="absolute inset-0 bg-accent/20 rounded-full blur-2xl group-hover:bg-accent/40 transition-all animate-pulse" />
                                <div className="relative flex items-center justify-center w-full h-full glass rounded-full border border-accent/30 group-hover:border-accent transition-all">
                                    <Upload
                                        size={40}
                                        className="text-accent"
                                    />
                                </div>
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold mb-3 tracking-tight">Compare Projects</h1>
                                <p className="text-text-secondary text-lg">
                                    {projects.length === 0
                                        ? "Drop up to 3 Docker Compose files here to analyze conflicts and dependencies across projects."
                                        : "Drop another compose file to start the comparison analysis."}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="px-8 py-4 bg-accent text-white rounded-2xl font-bold hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-accent/20"
                            >
                                Choose Files
                            </button>
                            <div className="grid grid-cols-2 gap-4 text-left">
                                <div className="p-4 glass rounded-2xl border border-border/50">
                                    <AlertTriangle
                                        className="text-warning mb-2"
                                        size={20}
                                    />
                                    <h3 className="font-semibold text-sm">Conflict Detection</h3>
                                    <p className="text-xs text-text-secondary mt-1">
                                        Identifies overlapping ports, networks, and service names.
                                    </p>
                                </div>
                                <div className="p-4 glass rounded-2xl border border-border/50">
                                    <Info
                                        className="text-accent mb-2"
                                        size={20}
                                    />
                                    <h3 className="font-semibold text-sm">Visual Mapping</h3>
                                    <p className="text-xs text-text-secondary mt-1">
                                        Generates a unified diagram of all interacting components.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-full bg-[#0b0f1a]">
                        <RenderedArchitectureDiagram
                            dot={dot}
                            ariaLabel="Combined project architecture diagram"
                            overlay={analysisOverlay}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

function CompareView() {
    return (
        <ProjectComparisonProvider>
            <CompareViewContent />
        </ProjectComparisonProvider>
    );
}

const Badge = memo(({ children, type }: PropsWithChildren<{ type: "error" | "success" }>) => (
    <span
        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            type === "error" ? "bg-error text-white" : "bg-success text-white"
        }`}
    >
        {children}
    </span>
));

Badge.displayName = "Badge";
CompareView.displayName = "CompareView";

export default CompareView;
