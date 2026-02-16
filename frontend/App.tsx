import { useState, useEffect, useCallback } from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { writeFile, readTextFile } from "@tauri-apps/plugin-fs";
import { load } from "@tauri-apps/plugin-store";
import { StoryState, Task } from "./types";
import { Header } from "./components/Header";
import { SettingsDialog } from "./components/SettingsDialog";
import { InspectorDialog } from "./components/InspectorDialog";
import { FileList } from "./components/FileList";
import { TaskDetail } from "./components/TaskDetail";
import { ResultsPanel } from "./components/ResultsPanel";
import { PipelineSidebar } from "./components/PipelineSidebar";
import { IS_TAURI } from "./lib/utils";
import { getOpenRouterModels, processCards } from "./lib/backend";


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
  const [storyModel, setStoryModel] = useState("Raven");
  const [taskModels, setTaskModels] = useState({
    perspective: "google/gemini-2.5-flash-lite",
    title: "google/gemini-2.5-flash-lite",
    characters: "anthropic/claude-sonnet-4.5",
    locations: "anthropic/claude-sonnet-4.5",
    concepts: "anthropic/claude-sonnet-4.5",
    summary: "anthropic/claude-sonnet-4.5",
  });
  
  const [prompts, setPrompts] = useState({
    perspective: "Identify the main perspective character of this story.",
    title: "Choose a fitting title for this story.",
    characters: `
Current story cards:     
$cards
    
    
Update the above story cards or write new ones for AI Dungeon for each character in the referenced story. Keep them ideal for LLM consumption, 1000 chars at most but the less the better. Use strong personality keywords opposed to complex personality descriptors. E.g. Kind-hearted, sweet, unforgiving, no buts or whens or anything there.

Write the story cards like so: 

*Charactername* is *concise summary of 1-2 lines*. 
Personality: 3-7 Keywords (e.g: Mean, Devoted, Blunt, Chuunibyou, Trickster)
Background: History, concise, avoid anything that may lead to repetition, cliche or action with LLMs. While you can include /major/ character changes or moment, avoid re-hashing the events from the story. Include relationships to other NPCs or $character if relevant.
Good examples: 
They grew up in a well-off family that owned an orchard, teaching them about the fruits of hard labor. 
They sometimes tug their braid.
Bad example: 
They do things with practiced ease. 
They often ask questions.

In terms of triggers, choose both, triggers of them being mentioned (their first name for example) AND triggers of likely contexts they may show up in. E.g. their job, place of living, goal, nation and so forth.

- Never edit data in brackets or configuration values. e.g. { updates: true }
- Avoid highly cliche-inducing personality keywords, like possessive or obsessive. Those personalities are fine, just use less strong keywords.
- Be proactive, feel free to generate interesting new characters inferred to exist from the story.
- Their purpose is for them to be used by $model to roleplay as the character. Specialize them to $model's quirks.
- Only send back character story cards you've changed. It is fine and expected that only a few characters are added or changed, or even none at all.`,
    locations: `
Current story cards:     
$cards

Based on the story given, update story cards that have meaningfully changed and generate new story cards for major, future-relevant locations. Always include the location name in the description of the location one or more times.

In terms of triggers, choose both, triggers of words in the location name (their first name for example) AND triggers of likely words to come up relevant to this location (e.g. war, france, palace, home, hospital, winter) .

- Keep descriptions concise, do not add events that happened as part of the story to the locations. Focus on physical descriptions and history referenced as being before the story / $character's relevance unless it is key to the location (e.g. they built it or destroyed it).
- Be proactive, feel free to generate new locations inferred from the story or very likely to be visited soon.
- Specialize it for $model.
- Keep them to at most 1000 characters, but ideally they are much smaller than that.
- Only send back location story cards you've changed. It is fine and expected that only a few locations are added or changed, or even none at all.\`,
`,
    concepts: `
Current story cards:     
$cards

Based on the story, generate story cards for new concepts (such as a magic system) that are important for the story and different from the real world / common tropes or major factions, or update existing ones if necessary. 

In terms of triggers, choose both, triggers of words in the concept/faction name (their first name for example) AND triggers of likely words to come up relevant to this card (e.g. war, france, palace, magic, mana, winter, leader's first name, kingdom name) .


- Keep them to at most 1000 characters, but ideally they are much smaller than that.
- Specialize it for $model.
- Only send back concept/faction story cards you've changed. It is fine and expected that only a few concepts / factions are added or changed, or even none at all.
`,
    summary: `
Story Cards: 
$cards

Current Summary:
$lastSummary


Based the given text, make a concise summary for an AI roleplaying game, from the perspective of $character.

The summary should be complete, with no RELEVANT dataloss.
Include:
- Relationships / current statuses
- Character building moments
- Relevant interactions
- Actions
- Transformations
- Changes in state of the character or possessions
- and so forth included along with atmospheres, notable memories or particularly telling / cute character moments / things that reveal someone's personality.
It should be done in a format ideal for the AI to derive the past while sticking to the original style as much as possible.

Exclude events that are unlikely to ever come up again / aren't relevant to any character arcs, transformations that are already made irrelevant by later changes and so on.
You shouldn't preserve things that are only part of the 'how' and not relevant for the future (e.g. exact process of transformation, method of winning the fight except if the method is likely to come up in the future) but absolutely should share the why's and who's of events.
Stick to the 'You did thing, you met y, you then. You ...' format. Focus more on data directly related to the current state than the past, as mentioning changed data can cause AI hallucinations. If someone changed their haircolor thrice, for example, only mention that they changed their haircolor the first two times - mentioning the current color for the third.

Keep to one concise blob of text. No formatting, headers, markdown or separate plot partitions or anything. Do not describe the current situation directly.

Example: 

You are name, a colossal white dragon who possesses the ability to shapeshift into a slender humanoid. You woke up in a damp but beautiful cave, surprised to be approached by a shivering girl, seeming terrified of you yet filled with determination.... You... You then... You met... They smiled as you told them about your pain, showing just how callous they are... They were... "...You're wrong. What I feel isn't hate, it is love..."... 
And so forth.


- If a last summary exists, add to that summary to create one complete summary, removing/adjusting irrelevant old data if fitting.
- Avoid rehashing or describing anything currently in a story card.
- Keep the summary below 10.000 characters
`,
  });

  // Multi-Story State
  const [stories, setStories] = useState<Record<string, StoryState>>({
    "default": {
      id: "default",
      name: "Default Story",
      lastLine: "",
      accumulatedSummary: "",
      accumulatedCards: [],
      character: "",
      storyTitle: "",
      storyPath: null,
      cardsPath: null
    }
  });
  const [currentStoryId, setCurrentStoryId] = useState("default");
  
  const currentStory = stories[currentStoryId] || stories["default"];

  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
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
    setStories(prev => ({
      ...prev,
      [currentStoryId]: { ...prev[currentStoryId], ...updates }
    }));
  };

  const createNewStory = () => {
    const id = Date.now().toString();
    const newStory: StoryState = {
      id,
      name: `New Story ${Object.keys(stories).length + 1}`,
      lastLine: "",
      accumulatedSummary: "",
      accumulatedCards: [],
      character: "",
      storyTitle: "",
      storyPath: null,
      cardsPath: null
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

  async function selectStoryFile() {
    if (IS_TAURI) {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Markdown", extensions: ["md"] }],
      });
      if (selected && !Array.isArray(selected)) {
        if (selected !== currentStory.storyPath) {
          updateCurrentStory({
            storyPath: selected,
            lastLine: "",
            name: selected.split(/[\\/]/).pop()?.replace(".md", "") || currentStory.name
          });
          setStatus("Story file loaded (reset line counter)");
        } else {
          setStatus("Story file already selected");
        }
      }
    } else {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".md";
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const content = await file.text();
          updateCurrentStory({
            storyPath: file.name,
            storyContent: content,
            lastLine: "",
            name: file.name.replace(".md", "") || currentStory.name
          });
          setStatus("Story file loaded");
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
      if (file.name.endsWith('.md')) {
        if (IS_TAURI) {
          const path = (file as any).path || file.name;
          if (path !== currentStory.storyPath) {
            updateCurrentStory({
              storyPath: path,
              lastLine: "",
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
            name: file.name.replace(".md", "") || currentStory.name
          });
          setStatus("Story file loaded");
        }
      } else {
        setStatus("Error: Please drop a .md file");
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
        updateCurrentStory({ cardsPath: selected });
        setStatus("Cards file loaded");
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
          updateCurrentStory({ cardsPath: path });
          setStatus("Cards file loaded");
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
    
    // Pre-populate tasks to ensure pipeline is not empty
    const initialTasks: Task[] = [
      { id: 'perspective', name: 'Detecting Perspective', status: 'waiting' },
      { id: 'title', name: 'Detecting Story Title', status: 'waiting' },
      { id: 'characters', name: 'Generating Characters', status: 'waiting' },
      { id: 'locations', name: 'Generating Locations', status: 'waiting' },
      { id: 'concepts', name: 'Generating Concepts/Factions', status: 'waiting' },
      { id: 'summary', name: 'Generating Summary', status: 'waiting' },
    ];
    setTasks(initialTasks);
    setSelectedTask(null);

    try {
      // Map AID model to underlying technical model for prompt insertion
      const underlyingModel = getUnderlyingModel(storyModel);

      let storyContent = currentStory.storyContent;
      if (IS_TAURI && currentStory.storyPath) {
        try {
          storyContent = await readTextFile(currentStory.storyPath);
        } catch (err) {
          throw new Error(`Failed to read story file: ${err}`);
        }
      }

      if (!storyContent) {
        throw new Error("Story content missing (re-select file)");
      }

      const result = await processCards({
        storyContent,
        lastLineText: currentStory.lastLine,
        lastSummary: currentStory.accumulatedSummary,
        lastCards: JSON.stringify(currentStory.accumulatedCards),
        lastCharacter: currentStory.character,
        lastStoryTitle: currentStory.storyTitle,
        openrouterKey,
        storyModel: underlyingModel,
        perspectiveModel: taskModels.perspective,
        titleModel: taskModels.title,
        charactersModel: taskModels.characters,
        locationsModel: taskModels.locations,
        conceptsModel: taskModels.concepts,
        summaryModel: taskModels.summary,
        perspectivePrompt: prompts.perspective,
        titlePrompt: prompts.title,
        charactersPrompt: prompts.characters,
        locationsPrompt: prompts.locations,
        conceptsPrompt: prompts.concepts,
        summaryPrompt: prompts.summary,
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
        lastLine: result.last_line,
        character: result.character,
        storyTitle: result.story_title,
        name: result.story_title || currentStory.name
      });

      setStatus("Processing complete!");
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
        onOpenChange={setShowInspector}
        currentStory={currentStory}
        updateCurrentStory={updateCurrentStory}
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
            />

            <ResultsPanel 
              currentStory={currentStory}
              updateCurrentStory={updateCurrentStory}
              saveCards={() => downloadResult(JSON.stringify(currentStory.accumulatedCards, null, 2), "story_cards.json")}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
