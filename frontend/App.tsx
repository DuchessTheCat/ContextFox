import { useState } from "react";
import { Header } from "./components/Header";
import { SettingsDialog } from "./components/SettingsDialog";
import { InspectorDialog } from "./components/InspectorDialog";
import { CardsInspectorDialog } from "./components/CardsInspectorDialog";
import { FileList } from "./components/FileList";
import { TaskDetail } from "./components/TaskDetail";
import { ResultsPanel } from "./components/ResultsPanel";
import { PipelineSidebar } from "./components/PipelineSidebar";
import { getOpenRouterModels } from "./lib/api/api-client";
import { AID_MODELS } from "./lib/model-mapping";
import { useStoryState } from "./hooks/useStoryState";
import { useSettings } from "./hooks/useSettings";
import { usePersistence } from "./hooks/usePersistence";
import { useFileSelection } from "./hooks/useFileSelection";
import { useStoryProcessor } from "./hooks/useStoryProcessor";
import { useCardToggle } from "./hooks/useCardToggle";
import { useFileDownload } from "./hooks/useFileDownload";


function App() {
  const storyState = useStoryState();
  const settings = useSettings();
  const {
    stories,
    setStories,
    currentStoryId,
    setCurrentStoryId,
    currentStory,
    updateCurrentStory,
    createNewStory,
    deleteStory,
  } = storyState;
  const {
    openrouterKey,
    setOpenrouterKey,
    storyModel,
    setStoryModel,
    taskModels,
    setTaskModels,
    selectedPreset,
    setSelectedPreset,
    customPresets,
    setCustomPresets,
    prompts,
    setPrompts,
    refusalPrompt,
    setRefusalPrompt,
    modelContextLengths,
    setModelContextLengths,
  } = settings;

  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [showCardsInspector, setShowCardsInspector] = useState(false);
  const [openrouterModels, setOpenrouterModels] = useState<string[]>([]);
  const [status, setStatus] = useState("Ready");
  const [isMaximized, setIsMaximized] = useState(false);

  // Hooks
  const { tasks, selectedTask, setSelectedTask, isProcessing, handleProcess } = useStoryProcessor();
  const { selectStoryFile, handleStoryFileDrop, selectCardsFile, handleCardsFileDrop } = useFileSelection(
    currentStoryId,
    currentStory,
    updateCurrentStory,
    setStatus
  );
  const { handleToggleExclude } = useCardToggle(currentStory, updateCurrentStory);
  const { downloadResult } = useFileDownload(setStatus);

  async function fetchModels(key: string) {
    if (!key) return;
    setStatus("Fetching models...");
    try {
      const { models, contextLengths } = await getOpenRouterModels(key);
      setOpenrouterModels(models);
      setModelContextLengths(contextLengths);
      setStatus("Models updated");
    } catch (e) {
      setStatus(`Error fetching models: ${e}`);
    }
  }

  usePersistence(
    {
      openrouterKey,
      storyModel,
      taskModels,
      prompts,
      refusalPrompt,
      stories,
      currentStoryId,
      customPresets,
      selectedPreset,
    },
    {
      setOpenrouterKey,
      setStoryModel,
      setTaskModels,
      setPrompts,
      setRefusalPrompt,
      setStories,
      setCurrentStoryId,
      setCustomPresets,
      setSelectedPreset,
    },
    fetchModels
  );

  function onProcess() {
    handleProcess(
      currentStory,
      currentStoryId,
      {
        storyModel,
        taskModels,
        prompts,
        refusalPrompt,
        openrouterKey,
        modelContextLengths,
      },
      updateCurrentStory,
      setStatus
    );
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
        selectedPreset={selectedPreset}
        setSelectedPreset={setSelectedPreset}
        customPresets={customPresets}
        setCustomPresets={setCustomPresets}
        openrouterModels={openrouterModels}
        prompts={prompts}
        setPrompts={setPrompts}
        refusalPrompt={refusalPrompt}
        setRefusalPrompt={setRefusalPrompt}
      />

      <InspectorDialog
        open={showInspector}
        onOpenChange={(open) => {
          if (!open && showCardsInspector) {
            return;
          }
          setShowInspector(open);
        }}
        currentStory={currentStory}
        currentStoryId={currentStoryId}
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
        onToggleExclude={handleToggleExclude}
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
              processFiles={onProcess}
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
