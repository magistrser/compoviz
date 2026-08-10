import { useState, type Dispatch, type SetStateAction } from "react";
import type { ImportFile, LoadFilesOverrides, LoadFilesResult } from "../models/composeTypes";
import type { ViewId } from "../context/UIContext";

interface DroppedFile {
    file: File;
    fullPath: string;
}

interface FileImportResult {
    isDragging: boolean;
    setIsDragging: Dispatch<SetStateAction<boolean>>;
    collectDroppedFiles: (dataTransfer: DataTransfer) => Promise<DroppedFile[]>;
    handleImport: (content: string, files?: ImportFile[], overrides?: LoadFilesOverrides) => Promise<void>;
}

function isFileEntry(entry: FileSystemEntry): entry is FileSystemFileEntry {
    return entry.isFile;
}

function isDirectoryEntry(entry: FileSystemEntry): entry is FileSystemDirectoryEntry {
    return entry.isDirectory;
}

function readFileEntry(entry: FileSystemFileEntry): Promise<File> {
    return new Promise((resolve, reject) => entry.file(resolve, reject));
}

function readAllEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
    return new Promise((resolve, reject) => {
        const entries: FileSystemEntry[] = [];
        const readChunk = () => {
            reader.readEntries((batch) => {
                if (batch.length === 0) {
                    resolve(entries);
                    return;
                }
                entries.push(...batch);
                readChunk();
            }, reject);
        };
        readChunk();
    });
}

export function useFileImport(
    loadFiles: (content: string, files?: ImportFile[], overrides?: LoadFilesOverrides) => Promise<LoadFilesResult>,
    setActiveView: (view: ViewId) => void,
    isMobile: boolean,
    onError?: (message: string) => void,
): FileImportResult {
    const [isDragging, setIsDragging] = useState(false);
    const showError = onError ?? console.error;

    const collectDroppedFiles = async (dataTransfer: DataTransfer): Promise<DroppedFile[]> => {
        const files: DroppedFile[] = [];
        const items = Array.from(dataTransfer.items);

        const walkEntry = async (entry: FileSystemEntry): Promise<void> => {
            if (isFileEntry(entry)) {
                files.push({ file: await readFileEntry(entry), fullPath: entry.fullPath });
                return;
            }
            if (isDirectoryEntry(entry)) {
                const children = await readAllEntries(entry.createReader());
                for (const child of children) await walkEntry(child);
            }
        };

        const entries = items
            .map((item) => item.webkitGetAsEntry())
            .filter((entry): entry is FileSystemEntry => entry !== null);
        if (entries.length > 0) {
            for (const entry of entries) await walkEntry(entry);
            return files;
        }

        return Array.from(dataTransfer.files).map((file) => ({
            file,
            fullPath: "",
        }));
    };

    const handleImport = async (
        content: string,
        files: ImportFile[] = [],
        overrides: LoadFilesOverrides = {},
    ): Promise<void> => {
        try {
            const result = await loadFiles(content, files, overrides);
            if (!result.success) {
                showError(`Invalid YAML: ${result.error ?? "Unknown error"}`);
                return;
            }
            if (isMobile) setActiveView("diagram");
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error("Import failed:", error);
            showError(`Import failed: ${message}`);
        }
    };

    return { isDragging, setIsDragging, collectDroppedFiles, handleImport };
}
