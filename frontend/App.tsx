import { useState, useEffect, useCallback } from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { writeFile, readTextFile, readFile } from "@tauri-apps/plugin-fs";
import { load } from "@tauri-apps/plugin-store";
import JSZip from "jszip";
import { StoryState, Task } from "./types";
import { Header } from "./components/Header";
import { SettingsDialog } from "./components/SettingsDialog";
import { InspectorDialog } from "./components/InspectorDialog";
import { CardsInspectorDialog } from "./components/CardsInspectorDialog";
import { FileList } from "./components/FileList";
import { TaskDetail } from "./components/TaskDetail";
import { ResultsPanel } from "./components/ResultsPanel";
import { PipelineSidebar } from "./components/PipelineSidebar";
import { IS_TAURI } from "./lib/utils";
import { getOpenRouterModels, processCards } from "./lib/backend";
import { DEFAULT_PROMPTS, DEFAULT_TASK_MODELS, DEFAULT_STORY_MODEL } from "./lib/defaults";


const AID_MODELS = [
  // Small Models (12B)
  "Muse",
  "Wayfarer Small 2",
  "Madness",
  // Medium Models (24B)
  "Hearthfire",
  "Harbinger",
  // Large Models (70B)
  "Nova",
  "Wayfarer Large",
  "Hermes 3 70B",
  // Very Large Models
  "DeepSeek",
  "Atlas",
  "Raven",
  "Hermes 3 405B"
];

const AID_MODEL_MAPPING: Record<string, string> = {
  // Very Large Models
  "Raven": "GLM-4.5",
  "Atlas": "DeepSeek-V3.2",
  "DeepSeek": "DeepSeek-V3.1",
  "Hermes 3 405B": "Llama-3.1-405B",
  // Large Models (70B)
  "Nova": "Llama-3.3-70B-Instruct",
  "Wayfarer Large": "Llama-3.3-70B-Instruct",
  "Hermes 3 70B": "Llama-3.1-70B",
  // Medium Models (24B)
  "Hearthfire": "Mistral-Small-24B-Instruct-2501",
  "Harbinger": "Mistral-Small-24B-Instruct-2501",
  // Small Models (12B)
  "Muse": "Mistral-Nemo-Base-2407",
  "Wayfarer Small 2": "Mistral-Nemo-Base-2407",
  "Madness": "Mistral-Nemo-Base-2407"
};

function getUnderlyingModel(aidModel: string): string {
  return AID_MODEL_MAPPING[aidModel] || aidModel;
}


function App() {
  // Global Settings
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [storyModel, setStoryModel] = useState(DEFAULT_STORY_MODEL);
  const [taskModels, setTaskModels] = useState(DEFAULT_TASK_MODELS);
  const [prompts, setPrompts] = useState(DEFAULT_PROMPTS);

  // Multi-Story State
  const [stories, setStories] = useState<Record<string, StoryState>>({
    "default": {
      id: "default",
      name: "Default Story",
      lastLine: "",
      currentPart: 1,
      accumulatedSummary: "",
      accumulatedCards: [],
      plotEssentials: "",
      character: "",
      storyTitle: "",
      storyPath: null,
      cardsPath: null,
      isZipFile: false,
      excludedCardTitles: [],
      includedCardTitles: []
    }
  });
  const [currentStoryId, setCurrentStoryId] = useState("default");
  
  const currentStory = stories[currentStoryId] || stories["default"];

  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [showCardsInspector, setShowCardsInspector] = useState(false);
  const [openrouterModels, setOpenrouterModels] = useState<string[]>([]);
  const [status, setStatus] = useState("Ready");
  const [isProcessing, setIsProcessing] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  // Load/Save Settings
  useEffect(() => {
    const initStore = async () => {
      try {
        let savedKey, savedStoryModel, savedTaskModels, savedPrompts, savedStories, savedCurrentStoryId;
        
        if (IS_TAURI) {
          const store = await load("settings.json", { autoSave: true, defaults: {} });
          savedKey = await store.get<string>("openrouterKey");
          savedStoryModel = await store.get<string>("storyModel");
          savedTaskModels = await store.get<any>("taskModels");
          savedPrompts = await store.get<any>("prompts");
          savedStories = await store.get<Record<string, StoryState>>("stories");
          savedCurrentStoryId = await store.get<string>("currentStoryId");
        } else {
          savedKey = localStorage.getItem("openrouterKey");
          savedStoryModel = localStorage.getItem("storyModel");
          const tm = localStorage.getItem("taskModels");
          if (tm) savedTaskModels = JSON.parse(tm);
          const p = localStorage.getItem("prompts");
          if (p) savedPrompts = JSON.parse(p);
          const s = localStorage.getItem("stories");
          if (s) savedStories = JSON.parse(s);
          savedCurrentStoryId = localStorage.getItem("currentStoryId");
        }
        
        if (savedKey) {
          setOpenrouterKey(savedKey);
          fetchModels(savedKey);
        }
        if (savedStoryModel) setStoryModel(savedStoryModel);
        if (savedTaskModels) setTaskModels(prev => ({ ...prev, ...savedTaskModels }));
        if (savedPrompts) setPrompts(prev => ({ ...prev, ...savedPrompts }));
        if (savedStories) setStories(savedStories);
        if (savedCurrentStoryId) setCurrentStoryId(savedCurrentStoryId);
      } catch (e) {
        console.error("Failed to load settings", e);
      }
    };
    initStore();
  }, []);

  const saveSettings = useCallback(async () => {
    try {
      if (IS_TAURI) {
        const store = await load("settings.json", { autoSave: true, defaults: {} });
        await store.set("openrouterKey", openrouterKey);
        await store.set("storyModel", storyModel);
        await store.set("taskModels", taskModels);
        await store.set("prompts", prompts);
        await store.set("stories", stories);
        await store.set("currentStoryId", currentStoryId);
      } else {
        localStorage.setItem("openrouterKey", openrouterKey);
        localStorage.setItem("storyModel", storyModel);
        localStorage.setItem("taskModels", JSON.stringify(taskModels));
        localStorage.setItem("prompts", JSON.stringify(prompts));
        localStorage.setItem("stories", JSON.stringify(stories));
        localStorage.setItem("currentStoryId", currentStoryId);
      }
    } catch (e) {
      console.error("Failed to save settings", e);
    }
  }, [openrouterKey, storyModel, taskModels, prompts, stories, currentStoryId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      saveSettings();
    }, 1000);
    return () => clearTimeout(timer);
  }, [saveSettings]);

  // Update current story helper
  const updateCurrentStory = (updates: Partial<StoryState>) => {
    console.log("updateCurrentStory called with:", updates);
    setStories(prev => {
      const story = { ...prev[currentStoryId], ...updates };

      // Convert zipParts Map to plain object for storage
      if (story.zipParts && story.zipParts instanceof Map) {
        story.zipParts = Object.fromEntries(story.zipParts) as any;
      }

      const updated = {
        ...prev,
        [currentStoryId]: story
      };
      console.log("Stories updated:", updated[currentStoryId]);
      return updated;
    });
  };

  const createNewStory = () => {
    const id = Date.now().toString();
    const newStory: StoryState = {
      id,
      name: `New Story ${Object.keys(stories).length + 1}`,
      lastLine: "",
      currentPart: 1,
      accumulatedSummary: "",
      accumulatedCards: [],
      plotEssentials: "",
      character: "",
      storyTitle: "",
      storyPath: null,
      cardsPath: null,
      isZipFile: false,
      excludedCardTitles: [],
      includedCardTitles: []
    };
    setStories(prev => ({ ...prev, [id]: newStory }));
    setCurrentStoryId(id);
  };

  const deleteStory = (id: string) => {
    if (Object.keys(stories).length <= 1) return;
    setStories(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (currentStoryId === id) {
      setCurrentStoryId(Object.keys(stories).find(k => k !== id) || "default");
    }
  };


  useEffect(() => {
    const timer = setTimeout(() => {
      saveSettings();
    }, 1000);
    return () => clearTimeout(timer);
  }, [saveSettings]);

  async function fetchModels(key: string) {
    if (!key) return;
    setStatus("Fetching models...");
    try {
      const models = await getOpenRouterModels(key);
      setOpenrouterModels(models);
      setStatus("Models updated");
    } catch (e) {
      setStatus(`Error fetching models: ${e}`);
    }
  }

  async function loadZipFile(fileData: ArrayBuffer, fileName: string) {
    fileName.length;
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

    return { parts, totalParts: parts.size };
  }

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
              const { parts } = await loadZipFile(buffer, selected);

              updateCurrentStory({
                storyPath: selected,
                lastLine: "",
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
              lastLine: "",
              currentPart: 1,
              isZipFile: false,
              name: selected.split(/[\\/]/).pop()?.replace(".md", "") || currentStory.name
            });
            setStatus("Story file loaded (reset line counter)");
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
              const { parts } = await loadZipFile(buffer, file.name);

              updateCurrentStory({
                storyPath: file.name,
                lastLine: "",
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
            updateCurrentStory({
              storyPath: file.name,
              storyContent: content,
              lastLine: "",
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

  const handleStoryFileDrop = async (e: any) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.md') || file.name.endsWith('.zip')) {
        if (file.name.endsWith('.zip')) {
          try {
            const buffer = await file.arrayBuffer();
            const { parts } = await loadZipFile(buffer, file.name);

            if (IS_TAURI) {
              const path = (file as any).path || file.name;
              updateCurrentStory({
                storyPath: path,
                lastLine: "",
                currentPart: 1,
                isZipFile: true,
                zipParts: parts,
                name: file.name.replace(".zip", "") || currentStory.name
              });
            } else {
              updateCurrentStory({
                storyPath: file.name,
                lastLine: "",
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
                lastLine: "",
                currentPart: 1,
                isZipFile: false,
                name: file.name.replace(".md", "") || currentStory.name
              });
              setStatus("Story file loaded (reset line counter)");
            } else {
              setStatus("Story file already selected");
            }
          } else {
            const content = await file.text();
            updateCurrentStory({
              storyPath: file.name,
              storyContent: content,
              lastLine: "",
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
  };

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

  const handleCardsFileDrop = async (e: any) => {
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
  };

  async function handleProcess() {
    if (!currentStory.storyPath) {
      setStatus("Error: Story file is required");
      return;
    }
    if (!openrouterKey) {
      setStatus("Error: OpenRouter API Key is required");
      return;
    }

    setIsProcessing(true);
    setStatus("Processing new content...");

    // Clear tasks - they will be populated by processCards with correct part indicators
    setTasks([]);
    setSelectedTask(null);

    try {
      // Map AID model to underlying technical model for prompt insertion
      const underlyingModel = getUnderlyingModel(storyModel);

      let storyContent = currentStory.storyContent;
      let zipPartsMap: Map<number, string> | undefined = currentStory.zipParts;

      // Reload file from disk if in Tauri mode
      if (IS_TAURI && currentStory.storyPath) {
        if (currentStory.isZipFile && currentStory.storyPath.endsWith('.zip')) {
          // Reload zip file
          try {
            const uint8Array = await readFile(currentStory.storyPath);
            const buffer = uint8Array.buffer;
            const { parts } = await loadZipFile(buffer, currentStory.storyPath);
            zipPartsMap = parts;
          } catch (err) {
            throw new Error(`Failed to read zip file: ${err}`);
          }
        } else {
          // Regular text file
          try {
            storyContent = await readTextFile(currentStory.storyPath);
          } catch (err) {
            throw new Error(`Failed to read story file: ${err}`);
          }
        }
      } else {
        // Browser mode or no path - use cached data
        if (currentStory.zipParts && !(currentStory.zipParts instanceof Map)) {
          // Convert plain object back to Map with numeric keys
          zipPartsMap = new Map(
            Object.entries(currentStory.zipParts).map(([k, v]) => [parseInt(k, 10), v as string])
          );
        }
      }

      if (!storyContent && !zipPartsMap) {
        throw new Error("Story content missing (re-select file)");
      }

      const result = await processCards({
        storyContent,
        lastLineText: currentStory.lastLine,
        currentPart: currentStory.currentPart || 1,
        isZipFile: currentStory.isZipFile || false,
        zipParts: zipPartsMap,
        lastSummary: currentStory.accumulatedSummary,
        lastCards: JSON.stringify(currentStory.accumulatedCards),
        lastPlotEssentials: currentStory.plotEssentials || "",
        lastCharacter: currentStory.character,
        lastStoryTitle: currentStory.storyTitle,
        excludedCardTitles: currentStory.excludedCardTitles || [],
        includedCardTitles: currentStory.includedCardTitles || [],
        openrouterKey,
        storyModel: underlyingModel,
        perspectiveModel: taskModels.perspective,
        titleModel: taskModels.title,
        charactersModel: taskModels.characters,
        locationsModel: taskModels.locations,
        conceptsModel: taskModels.concepts,
        summaryModel: taskModels.summary,
        plotEssentialsModel: taskModels.plotEssentials,
        coreSelfModel: taskModels.coreSelf,
        perspectivePrompt: prompts.perspective,
        titlePrompt: prompts.title,
        charactersPrompt: prompts.characters,
        locationsPrompt: prompts.locations,
        conceptsPrompt: prompts.concepts,
        summaryPrompt: prompts.summary,
        plotEssentialsPrompt: prompts.plotEssentials,
        plotEssentialsWithContextPrompt: prompts.plotEssentialsWithContext,
        coreSelfPrompt: prompts.coreSelf,
        onTaskUpdate: (update) => {
          setTasks(prev => {
            const exists = prev.some(t => t.id === update.id);
            if (exists) {
              return prev.map(t => {
                if (t.id === update.id) {
                   const merged = { ...t };
                   if (update.status) merged.status = update.status;
                   if (update.name) merged.name = update.name;
                   if (update.context !== undefined) merged.context = update.context;
                   if (update.output !== undefined) merged.output = update.output;
                   return merged;
                }
                return t;
              });
            } else {
              return [...prev, update as Task];
            }
          });
        }
      });

      const updatedCards = JSON.parse(result.story_cards);
      const updatedSummary = currentStory.accumulatedSummary ? `${currentStory.accumulatedSummary}\n\n${result.summary}` : result.summary;

      updateCurrentStory({
        accumulatedCards: updatedCards,
        accumulatedSummary: updatedSummary,
        plotEssentials: result.plot_essentials,
        lastLine: result.last_line,
        currentPart: result.current_part,
        character: result.character,
        storyTitle: result.story_title,
        name: result.story_title || currentStory.name
      });

      // Check if there are more parts to process
      const totalParts = zipPartsMap instanceof Map ? zipPartsMap.size : 1;
      const hasMoreParts = currentStory.isZipFile && result.current_part < totalParts;

      if (hasMoreParts) {
        setStatus(`Part ${result.current_part}/${totalParts} complete. Click Process to continue.`);
      } else {
        setStatus("Processing complete!");
      }
    } catch (error) {
      setStatus(`Error: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  }

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

  return (
    <div className="h-screen bg-background text-foreground flex flex-col font-sans selection:bg-slate-800 overflow-hidden">
      <Header 
        currentStoryId={currentStoryId}
        setCurrentStoryId={setCurrentStoryId}
        stories={stories}
        createNewStory={createNewStory}
        deleteStory={deleteStory}
        setShowInspector={setShowInspector}
        setShowSettings={setShowSettings}
        isMaximized={isMaximized}
        setIsMaximized={setIsMaximized}
        status={status}
        isProcessing={isProcessing}
      />

      <SettingsDialog 
        open={showSettings}
        onOpenChange={setShowSettings}
        openrouterKey={openrouterKey}
        setOpenrouterKey={setOpenrouterKey}
        fetchModels={fetchModels}
        taskModels={taskModels}
        setTaskModels={setTaskModels}
        openrouterModels={openrouterModels}
        prompts={prompts}
        setPrompts={setPrompts}
      />

      <InspectorDialog
        open={showInspector}
        onOpenChange={(open) => {
          // Only allow closing story inspector if cards inspector is not open
          if (!open && showCardsInspector) {
            return;
          }
          setShowInspector(open);
        }}
        currentStory={currentStory}
        updateCurrentStory={updateCurrentStory}
        onOpenCardsInspector={() => setShowCardsInspector(true)}
        cardsInspectorOpen={showCardsInspector}
      />

      <CardsInspectorDialog
        open={showCardsInspector}
        onOpenChange={setShowCardsInspector}
        cards={currentStory.accumulatedCards}
        excludedCardTitles={currentStory.excludedCardTitles || []}
        includedCardTitles={currentStory.includedCardTitles || []}
        onToggleExclude={(title) => {
          const card = currentStory.accumulatedCards.find(c => c.title === title);
          if (!card) return;

          const isBrainCard = card.title.toLowerCase().includes("brain") || (card.type && card.type.toLowerCase() === "brain");
          const isDefaultExcluded = card.title.includes("Configure") || isBrainCard;

          const currentExcluded = currentStory.excludedCardTitles || [];
          const currentIncluded = currentStory.includedCardTitles || [];

          if (isDefaultExcluded) {
            // Toggle default excluded card via included list
            if (currentIncluded.includes(title)) {
              // Remove from included (back to excluded)
              updateCurrentStory({ includedCardTitles: currentIncluded.filter(t => t !== title) });
            } else {
              // Add to included
              updateCurrentStory({ includedCardTitles: [...currentIncluded, title] });
            }
          } else {
            // Toggle regular card via excluded list
            if (currentExcluded.includes(title)) {
              updateCurrentStory({ excludedCardTitles: currentExcluded.filter(t => t !== title) });
            } else {
              updateCurrentStory({ excludedCardTitles: [...currentExcluded, title] });
            }
          }
        }}
        onUpdateCards={(cards) => updateCurrentStory({ accumulatedCards: cards })}
      />

      <TaskDetail 
        task={selectedTask} 
        onClose={() => setSelectedTask(null)} 
      />

      <div className="flex-1 flex overflow-hidden">
        <PipelineSidebar 
          tasks={tasks}
          selectedTask={selectedTask}
          setSelectedTask={setSelectedTask}
          isProcessing={isProcessing}
        />

        <main className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
          <div className="max-w-[1200px] mx-auto space-y-8">
            <FileList
              currentStory={currentStory}
              selectStoryFile={selectStoryFile}
              selectCardsFile={selectCardsFile}
              handleStoryFileDrop={handleStoryFileDrop}
              handleCardsFileDrop={handleCardsFileDrop}
              processFiles={handleProcess}
              isProcessing={isProcessing}
              storyModel={storyModel}
              setStoryModel={setStoryModel}
              aidModels={AID_MODELS}
              onInspectCards={() => setShowCardsInspector(true)}
            />

            <ResultsPanel
              currentStory={currentStory}
              updateCurrentStory={updateCurrentStory}
              saveCards={() => downloadResult(JSON.stringify(currentStory.accumulatedCards, null, 2), "story_cards.json")}
              onOpenCardsInspector={() => setShowCardsInspector(true)}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
