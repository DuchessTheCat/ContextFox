import { IS_TAURI } from "../utils";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readFile, readTextFile, writeFile } from "@tauri-apps/plugin-fs";
import JSZip from "jszip";
import { loadFileContents } from "../storage";

/**
 * File loading and saving operations
 * Handles file dialogs, reading files, and writing files for both Tauri and web
 */

export interface FileContent {
  storyContent?: string;
  zipParts?: Map<number, string>;
  isZipFile: boolean;
}

export async function loadZipFile(fileData: ArrayBuffer): Promise<Map<number, string>> {
  const zip = new JSZip();
  const loaded = await zip.loadAsync(fileData);

  const parts = new Map<number, string>();
  const partFiles: { num: number; file: JSZip.JSZipObject }[] = [];

  // Find all part-XX.md files
  loaded.forEach((relativePath, file) => {
    const match = relativePath.match(/part-(\d+)\.md$/i);
    if (match && !file.dir) {
      partFiles.push({ num: parseInt(match[1]), file });
    }
  });

  // Sort by part number
  partFiles.sort((a, b) => a.num - b.num);

  // Load all parts
  for (const { num, file } of partFiles) {
    const content = await file.async("text");
    parts.set(num, content);
  }

  if (parts.size === 0) {
    throw new Error("No part-XX.md files found in zip");
  }

  return parts;
}

export interface StoryFileSelection {
  path: string;
  content?: string;
  parts?: Map<number, string>;
  isZip: boolean;
}

export async function selectStoryFile(): Promise<StoryFileSelection | null> {
  if (IS_TAURI) {
    const selected = await open({
      multiple: false,
      filters: [
        { name: "Story Files", extensions: ["md", "zip"] }
      ],
    });

    if (selected && !Array.isArray(selected)) {
      if (selected.endsWith('.zip')) {
        const uint8Array = await readFile(selected);
        const buffer = uint8Array.buffer;
        const parts = await loadZipFile(buffer);

        return {
          path: selected,
          parts,
          isZip: true
        };
      } else {
        return {
          path: selected,
          isZip: false
        };
      }
    }

    return null;
  } else {
    // Web version - use file input
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".md,.zip";
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          if (file.name.endsWith('.zip')) {
            const buffer = await file.arrayBuffer();
            const parts = await loadZipFile(buffer);

            resolve({
              path: file.name,
              parts,
              isZip: true
            });
          } else {
            const content = await file.text();

            resolve({
              path: file.name,
              content,
              isZip: false
            });
          }
        } else {
          resolve(null);
        }
      };
      input.click();
    });
  }
}

export interface CardsFileSelection {
  path: string;
  content: string;
}

export async function selectCardsFile(): Promise<CardsFileSelection | null> {
  if (IS_TAURI) {
    const selected = await open({
      multiple: false,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });

    if (selected && !Array.isArray(selected)) {
      const content = await readTextFile(selected);
      return {
        path: selected,
        content
      };
    }

    return null;
  } else {
    // Web version
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const content = await file.text();
          resolve({
            path: file.name,
            content
          });
        } else {
          resolve(null);
        }
      };
      input.click();
    });
  }
}

/**
 * Load file content from IndexedDB or disk (Tauri only)
 */
export async function loadFileContent(
  storyId: string,
  storyPath: string | null,
  isZipFile: boolean
): Promise<FileContent> {
  let storyContent: string | undefined;
  let zipParts: Map<number, string> | undefined;

  // Load file contents from IndexedDB first (works for both Tauri and web)
  const cachedContents = await loadFileContents(storyId);

  if (cachedContents) {
    if (cachedContents.zipParts) {
      zipParts = new Map(
        Object.entries(cachedContents.zipParts).map(([k, v]) => [parseInt(k, 10), v])
      );
    }
    if (cachedContents.storyContent) {
      storyContent = cachedContents.storyContent;
    }
  }

  // Only try disk read if not cached and we're in Tauri
  if (!storyContent && !zipParts && IS_TAURI && storyPath) {
    if (isZipFile && storyPath.endsWith(".zip")) {
      try {
        const uint8Array = await readFile(storyPath);
        const buffer = uint8Array.buffer;
        zipParts = await loadZipFile(buffer);
      } catch (err) {
        throw new Error(`Failed to read zip file: ${err}`);
      }
    } else {
      try {
        storyContent = await readTextFile(storyPath);
      } catch (err) {
        throw new Error(`Failed to read story file: ${err}`);
      }
    }
  }

  if (!storyContent && !zipParts) {
    throw new Error("Story content missing (re-select file)");
  }

  return {
    storyContent,
    zipParts,
    isZipFile: isZipFile || !!zipParts,
  };
}

export async function downloadFile(
  content: string,
  filename: string,
  setStatus: (status: string) => void
): Promise<void> {
  if (IS_TAURI) {
    try {
      const path = await save({
        defaultPath: filename,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (path) {
        await writeFile(path, new TextEncoder().encode(content));
        setStatus(`Saved to ${path.split(/[\\/]/).pop()}`);
      }
    } catch (e) {
      setStatus(`Error saving file: ${e}`);
    }
  } else {
    const blob = new Blob([content], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setStatus(`Downloaded ${filename}`);
  }
}
