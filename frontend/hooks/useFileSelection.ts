/**
 * Hook for file selection logic (story and cards files)
 */

import { open } from "@tauri-apps/plugin-dialog";
import { readFile, readTextFile } from "@tauri-apps/plugin-fs";
import { IS_TAURI } from "../lib/utils";
import { loadZipFile } from "../lib/content/file-operations";
import { saveFileContents } from "../lib/storage";
import { StoryState } from "../types";

export function useFileSelection(
  currentStoryId: string,
  currentStory: StoryState,
  updateCurrentStory: (updates: Partial<StoryState>) => void,
  setStatus: (status: string) => void
) {
  async function selectStoryFile() {
    if (IS_TAURI) {
      const selected = await open({
        multiple: false,
        filters: [
          { name: "Story Files", extensions: ["md", "zip"] }
        ],
      });
      if (selected && !Array.isArray(selected)) {
        if (selected !== currentStory.storyPath) {
          if (selected.endsWith('.zip')) {
            try {
              const uint8Array = await readFile(selected);
              const buffer = uint8Array.buffer;
              const parts = await loadZipFile(buffer);

              await saveFileContents(currentStoryId, {
                zipParts: Object.fromEntries(parts)
              });

              updateCurrentStory({
                storyPath: selected,
                currentPart: 1,
                isZipFile: true,
                zipParts: parts,
                name: selected.split(/[\\/]/).pop()?.replace(".zip", "") || currentStory.name
              });
              setStatus(`Story zip loaded (${parts.size} parts, reset to part 1)`);
            } catch (err) {
              setStatus(`Error loading zip: ${err}`);
            }
          } else {
            updateCurrentStory({
              storyPath: selected,
              currentPart: 1,
              isZipFile: false,
              name: selected.split(/[\\/]/).pop()?.replace(".md", "") || currentStory.name
            });
            setStatus("Story file loaded");
          }
        } else {
          setStatus("Story file already selected");
        }
      }
    } else {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".md,.zip";
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          if (file.name.endsWith('.zip')) {
            try {
              const buffer = await file.arrayBuffer();
              const parts = await loadZipFile(buffer);

              await saveFileContents(currentStoryId, {
                zipParts: Object.fromEntries(parts)
              });

              updateCurrentStory({
                storyPath: file.name,
                currentPart: 1,
                isZipFile: true,
                zipParts: parts,
                name: file.name.replace(".zip", "") || currentStory.name
              });
              setStatus(`Story zip loaded (${parts.size} parts)`);
            } catch (err) {
              setStatus(`Error loading zip: ${err}`);
            }
          } else {
            const content = await file.text();

            await saveFileContents(currentStoryId, {
              storyContent: content
            });

            updateCurrentStory({
              storyPath: file.name,
              storyContent: content,
              currentPart: 1,
              isZipFile: false,
              name: file.name.replace(".md", "") || currentStory.name
            });
            setStatus("Story file loaded");
          }
        }
      };
      input.click();
    }
  }

  async function handleStoryFileDrop(e: any) {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.md') || file.name.endsWith('.zip')) {
        if (file.name.endsWith('.zip')) {
          try {
            const buffer = await file.arrayBuffer();
            const parts = await loadZipFile(buffer);

            if (IS_TAURI) {
              const path = (file as any).path || file.name;
              updateCurrentStory({
                storyPath: path,
                currentPart: 1,
                isZipFile: true,
                zipParts: parts,
                name: file.name.replace(".zip", "") || currentStory.name
              });
            } else {
              updateCurrentStory({
                storyPath: file.name,
                currentPart: 1,
                isZipFile: true,
                zipParts: parts,
                name: file.name.replace(".zip", "") || currentStory.name
              });
            }
            setStatus(`Story zip loaded (${parts.size} parts, reset to part 1)`);
          } catch (err) {
            setStatus(`Error loading zip: ${err}`);
          }
        } else if (file.name.endsWith('.md')) {
          if (IS_TAURI) {
            const path = (file as any).path || file.name;
            if (path !== currentStory.storyPath) {
              updateCurrentStory({
                storyPath: path,
                currentPart: 1,
                isZipFile: false,
                name: file.name.replace(".md", "") || currentStory.name
              });
              setStatus("Story file loaded");
            } else {
              setStatus("Story file already selected");
            }
          } else {
            const content = await file.text();
            updateCurrentStory({
              storyPath: file.name,
              storyContent: content,
              currentPart: 1,
              isZipFile: false,
              name: file.name.replace(".md", "") || currentStory.name
            });
            setStatus("Story file loaded");
          }
        }
      } else {
        setStatus("Error: Please drop a .md or .zip file");
      }
    }
  }

  async function selectCardsFile() {
    if (IS_TAURI) {
      const selected = await open({
        multiple: false,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (selected && !Array.isArray(selected)) {
        try {
          const content = await readTextFile(selected);
          const cards = JSON.parse(content);

          await saveFileContents(currentStoryId, {
            cardsContent: content
          });

          updateCurrentStory({
            cardsPath: selected,
            accumulatedCards: cards
          });
          setStatus(`Cards file loaded (${cards.length} cards)`);
        } catch (err: any) {
          console.error("Error loading cards:", err);
          setStatus(`Error loading cards: ${err?.message || err}`);
        }
      }
    } else {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const content = await file.text();
          try {
            const cards = JSON.parse(content);

            await saveFileContents(currentStoryId, {
              cardsContent: content
            });

            updateCurrentStory({
              cardsPath: file.name,
              accumulatedCards: cards,
              cardsContent: content
            });
            setStatus("Cards file loaded");
          } catch (err) {
            setStatus("Error: Invalid JSON in cards file");
          }
        }
      };
      input.click();
    }
  }

  async function handleCardsFileDrop(e: any) {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.json')) {
        if (IS_TAURI) {
          const path = (file as any).path || file.name;
          try {
            const content = await readTextFile(path);
            const cards = JSON.parse(content);
            updateCurrentStory({
              cardsPath: path,
              accumulatedCards: cards
            });
            setStatus(`Cards file loaded (${cards.length} cards)`);
          } catch (err: any) {
            console.error("Error loading cards:", err);
            setStatus(`Error loading cards: ${err?.message || err}`);
          }
        } else {
          const content = await file.text();
          try {
            const cards = JSON.parse(content);
            updateCurrentStory({
              cardsPath: file.name,
              accumulatedCards: cards,
              cardsContent: content
            });
            setStatus("Cards file loaded");
          } catch (err) {
            setStatus("Error: Invalid JSON in cards file");
          }
        }
      } else {
        setStatus("Error: Please drop a .json file");
      }
    }
  }

  return {
    selectStoryFile,
    handleStoryFileDrop,
    selectCardsFile,
    handleCardsFileDrop,
  };
}
