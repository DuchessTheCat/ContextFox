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
import { useModelConfig } from "./hooks/useModelConfig";
import { ModelConfigDialog } from "./components/ModelConfigDialog";
import { parseCardsResponse, parseSummaryResponse, parsePlotEssentialsResponse, parseCoreSelfResponse } from "./lib/parsing/json-parsing";
import { applyCoreSelfUpdates } from "./lib/utils/core-self-updater";
import { isBrainCard } from "./lib/utils/card-filtering";
import { StoryCard } from "./types";


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
    requirePermissionBetweenParts,
    setRequirePermissionBetweenParts,
  } = settings;

  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [showModelConfig, setShowModelConfig] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [showCardsInspector, setShowCardsInspector] = useState(false);
  const [openrouterModels, setOpenrouterModels] = useState<string[]>([]);
  const [status, setStatus] = useState("Ready");
  const [isMaximized, setIsMaximized] = useState(false);

  // Hooks
  const { tasks, selectedTask, setSelectedTask, isProcessing, waitingForContinue, handleContinue, handleProcess, retryTask } = useStoryProcessor();
  const { selectStoryFile, handleStoryFileDrop, selectCardsFile, handleCardsFileDrop } = useFileSelection(
    currentStoryId,
    currentStory,
    updateCurrentStory,
    setStatus
  );
  const { handleToggleExclude } = useCardToggle(currentStory, updateCurrentStory);
  const { downloadResult } = useFileDownload(setStatus);
  const { modelConfigs, saveModelConfig } = useModelConfig();

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
      requirePermissionBetweenParts,
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
      setRequirePermissionBetweenParts,
    },
    fetchModels
  );

  function onProcess() {
    handleProcess(
      () => stories[currentStoryId] || stories["default"],
      currentStoryId,
      {
        storyModel,
        taskModels,
        prompts,
        refusalPrompt,
        openrouterKey,
        modelContextLengths,
        modelConfigs,
        requirePermissionBetweenParts,
      },
      updateCurrentStory,
      setStatus
    );
  }

  function handleMarkRetried(taskId: string) {
    // Strip part number and get base task type
    const baseTaskId = taskId.split(' ')[0];
    console.log('Marking as retried:', baseTaskId);
    // This will be handled by the useStoryProcessor ref
  }

  function handleRetryTaskUpdate(taskId: string, result: string, storeRetryValue: (field: string, value: any) => void) {
    console.log('handleRetryTaskUpdate called with taskId:', taskId);
    console.log('Result preview:', result.substring(0, 200));

    // Strip part number from taskId (e.g., "summary (1/4)" -> "summary")
    const baseTaskId = taskId.split(' ')[0];
    console.log('Base task ID:', baseTaskId);

    try {
      // Determine task type and parse accordingly
      if (baseTaskId === 'characters' || baseTaskId === 'locations' || baseTaskId === 'concepts') {
        // Card generation tasks
        console.log('Parsing cards for task:', taskId);
        const newCards = parseCardsResponse(result);
        console.log('Parsed cards:', newCards.length);
        const existingCards = currentStory.accumulatedCards || [];

        // Merge new cards with existing ones
        const mergedCards: StoryCard[] = [...existingCards];
        newCards.forEach((newCard: StoryCard) => {
          const existingIndex = mergedCards.findIndex(c => c.keys === newCard.keys);
          if (existingIndex >= 0) {
            mergedCards[existingIndex] = newCard;
          } else {
            mergedCards.push(newCard);
          }
        });

        console.log('Updating story with', mergedCards.length, 'cards');
        updateCurrentStory({
          accumulatedCards: mergedCards,
          cardsContent: JSON.stringify(mergedCards, null, 2)
        });
        storeRetryValue('cards', JSON.stringify(mergedCards));
        console.log('Story update complete for cards');
      } else if (baseTaskId === 'summary') {
        // Summary task
        console.log('Parsing summary');
        const summary = parseSummaryResponse(result, currentStory.accumulatedSummary || "");
        console.log('Parsed summary length:', summary.length);
        console.log('About to update with summary:', summary.substring(0, 100));
        updateCurrentStory({ accumulatedSummary: summary });
        storeRetryValue('summary', summary);
        console.log('Story update complete for summary');
      } else if (baseTaskId === 'plot-essentials') {
        // Plot essentials task
        console.log('Parsing plot essentials');
        const plotEssentials = parsePlotEssentialsResponse(result);
        console.log('Parsed plot essentials length:', plotEssentials.length);
        updateCurrentStory({ plotEssentials });
        storeRetryValue('plotEssentials', plotEssentials);
        console.log('Story update complete for plot essentials');
      } else if (baseTaskId === 'core-self') {
        // Core self task
        console.log('Parsing core self');
        const updates = parseCoreSelfResponse(result);
        console.log('Parsed core self updates:', updates.length);
        const existingCards = currentStory.accumulatedCards || [];
        const updatedCards = applyCoreSelfUpdates(existingCards, updates, isBrainCard);

        updateCurrentStory({
          accumulatedCards: updatedCards,
          cardsContent: JSON.stringify(updatedCards, null, 2)
        });
        storeRetryValue('cards', JSON.stringify(updatedCards));
        console.log('Story update complete for core self');
      } else if (baseTaskId === 'perspective') {
        // Perspective/character detection
        console.log('Parsing perspective');
        try {
          const json = JSON.parse(result);
          if (json.character) {
            updateCurrentStory({ character: json.character });
            storeRetryValue('character', json.character);
            console.log('Updated character to:', json.character);
          }
        } catch (e) {
          console.error("Failed to parse perspective result:", e);
        }
      } else if (baseTaskId === 'title') {
        // Title detection
        console.log('Parsing title');
        try {
          const json = JSON.parse(result);
          if (json.title) {
            updateCurrentStory({ storyTitle: json.title });
            storeRetryValue('storyTitle', json.title);
            console.log('Updated title to:', json.title);
          }
        } catch (e) {
          console.error("Failed to parse title result:", e);
        }
      } else {
        console.log('Unknown task type, not applying updates:', baseTaskId);
      }
    } catch (error) {
      console.error("Error processing retry task update:", error);
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
        selectedPreset={selectedPreset}
        setSelectedPreset={setSelectedPreset}
        customPresets={customPresets}
        setCustomPresets={setCustomPresets}
        openrouterModels={openrouterModels}
        prompts={prompts}
        setPrompts={setPrompts}
        refusalPrompt={refusalPrompt}
        setRefusalPrompt={setRefusalPrompt}
        requirePermissionBetweenParts={requirePermissionBetweenParts}
        setRequirePermissionBetweenParts={setRequirePermissionBetweenParts}
        onOpenModelConfig={() => setShowModelConfig(true)}
      />

      <ModelConfigDialog
        open={showModelConfig}
        onOpenChange={setShowModelConfig}
        availableModels={openrouterModels}
        modelConfigs={modelConfigs}
        onSaveConfig={saveModelConfig}
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
        onRetry={(taskId, editedPrompt) => retryTask(taskId, editedPrompt, openrouterKey, modelConfigs, handleRetryTaskUpdate, handleMarkRetried)}
      />

      <div className="flex-1 flex overflow-hidden">
        <PipelineSidebar
          tasks={tasks}
          selectedTask={selectedTask}
          setSelectedTask={setSelectedTask}
          isProcessing={isProcessing}
          waitingForContinue={waitingForContinue}
          onContinue={handleContinue}
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
