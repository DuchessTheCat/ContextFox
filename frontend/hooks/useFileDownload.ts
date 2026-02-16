/**
 * Hook for file download functionality
 */

import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { IS_TAURI } from "../lib/utils";

export function useFileDownload(setStatus: (status: string) => void) {
  async function downloadResult(content: string, filename: string) {
    if (IS_TAURI) {
      try {
        const path = await save({
          defaultPath: filename,
          filters: [{ name: "JSON", extensions: ["json"] }]
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

  return { downloadResult };
}
