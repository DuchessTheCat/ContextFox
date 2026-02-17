/**
 * Hook for story processing operations
 */

import { useState, useRef } from "react";
import { Task, StoryState } from "../types";
import { processStory } from "../lib/story-processor";
import { loadFileContent } from "../lib/content/file-operations";
import { applySplitting, getMinimumContextLength, getSplitStatusMessage } from "../lib/content/context-splitting";
import { getUnderlyingModel } from "../lib/model-mapping";
import { ModelConfig, getModelConfig } from "../types/modelConfig";
import { callOpenRouter as apiCallOpenRouter } from "../lib/api/api-client";

interface ProcessorSettings {
  storyModel: string;
  taskModels: {
    perspective: string;
    title: string;
    characters: string;
    locations: string;
    concepts: string;
    summary: string;
    plotEssentials: string;
    coreSelf: string;
  };
  prompts: {
    perspective: string;
    title: string;
    characters: string;
    locations: string;
    concepts: string;
    summary: string;
    plotEssentials: string;
    plotEssentialsWithContext: string;
    coreSelf: string;
  };
  refusalPrompt: string;
  openrouterKey: string;
  modelContextLengths: Record<string, number>;
  modelConfigs: Record<string, ModelConfig>;
  requirePermissionBetweenParts: boolean;
}

export function useStoryProcessor() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [waitingForContinue, setWaitingForContinue] = useState(false);
  const [continueCallback, setContinueCallback] = useState<(() => void) | null>(null);

  // CENTRAL SHARED OBJECT - all tasks read from and write to this
  const currentValuesRef = useRef<{
    summary: string;
    cards: string;
    plotEssentials: string;
    character: string;
    storyTitle: string;
  }>({
    summary: "",
    cards: "[]",
    plotEssentials: "",
    character: "",
    storyTitle: ""
  });

  // Track which task IDs have been manually retried - ignore their original callbacks
  const retriedTaskIdsRef = useRef<Set<string>>(new Set());

  const handleContinue = () => {
    if (continueCallback) {
      setWaitingForContinue(false);
      setContinueCallback(null);
      continueCallback();
    }
  };

  const processNextPart = async (
    zipPartsMap: Map<number, string> | undefined,
    partToProcess: number,
    getCurrentStory: () => StoryState,
    settings: ProcessorSettings,
    updateCurrentStory: (updates: Partial<StoryState>) => void,
    setStatus: (status: string) => void
  ): Promise<void> => {
    const currentStory = getCurrentStory();

    // Initialize central object from current state at START of processing
    if (partToProcess === 1) {
      currentValuesRef.current = {
        summary: currentStory.accumulatedSummary || "",
        cards: JSON.stringify(currentStory.accumulatedCards || []),
        plotEssentials: currentStory.plotEssentials || "",
        character: currentStory.character || "",
        storyTitle: currentStory.storyTitle || ""
      };
      retriedTaskIdsRef.current.clear();
      console.log('[INIT] Initialized central object from state:', {
        summary: currentValuesRef.current.summary.substring(0, 80),
        cards: `${JSON.parse(currentValuesRef.current.cards).length} cards`
      });
    }

    try {
      const underlyingModel = getUnderlyingModel(settings.storyModel);

      const result = await processStory({
        storyContent: "",
        lastLineText: currentStory.lastLine,
        currentPart: partToProcess,
        isZipFile: currentStory.isZipFile || false,
        zipParts: zipPartsMap,
        getLastSummary: () => currentValuesRef.current.summary,
        getLastCards: () => currentValuesRef.current.cards,
        getLastPlotEssentials: () => currentValuesRef.current.plotEssentials,
        getLastCharacter: () => currentValuesRef.current.character,
        getLastStoryTitle: () => currentValuesRef.current.storyTitle,
        excludedCardTitles: currentStory.excludedCardTitles || [],
        includedCardTitles: currentStory.includedCardTitles || [],
        openrouterKey: settings.openrouterKey,
        storyModel: underlyingModel,
        perspectiveModel: settings.taskModels.perspective,
        titleModel: settings.taskModels.title,
        charactersModel: settings.taskModels.characters,
        locationsModel: settings.taskModels.locations,
        conceptsModel: settings.taskModels.concepts,
        summaryModel: settings.taskModels.summary,
        plotEssentialsModel: settings.taskModels.plotEssentials,
        coreSelfModel: settings.taskModels.coreSelf,
        perspectivePrompt: settings.prompts.perspective,
        titlePrompt: settings.prompts.title,
        charactersPrompt: settings.prompts.characters,
        locationsPrompt: settings.prompts.locations,
        conceptsPrompt: settings.prompts.concepts,
        summaryPrompt: settings.prompts.summary,
        plotEssentialsPrompt: settings.prompts.plotEssentials,
        plotEssentialsWithContextPrompt: settings.prompts.plotEssentialsWithContext,
        coreSelfPrompt: settings.prompts.coreSelf,
        refusalPrompt: settings.refusalPrompt,
        modelConfigs: settings.modelConfigs,
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
        },
        onTaskComplete: (taskId: string, taskType: string, parsedResult: any) => {
          // Ignore callbacks for tasks that were manually retried
          if (retriedTaskIdsRef.current.has(taskId)) {
            console.log('[IGNORE] Ignoring callback for retried task:', taskId);
            return;
          }

          if (taskType === 'plotEssentials') {
            currentValuesRef.current.plotEssentials = parsedResult;
            console.log('[WRITE] Updated plotEssentials:', parsedResult?.substring(0, 80));
          } else if (taskType === 'summary') {
            currentValuesRef.current.summary = parsedResult;
            console.log('[WRITE] Updated summary:', parsedResult?.substring(0, 80));
          } else if (taskType === 'cards') {
            currentValuesRef.current.cards = JSON.stringify(parsedResult);
            console.log('[WRITE] Updated cards:', parsedResult.length, 'cards');
          }
        }
      });

      const freshStory = getCurrentStory();
      const totalParts = zipPartsMap instanceof Map ? zipPartsMap.size : 1;
      const hasMoreParts = freshStory.isZipFile && result.current_part < totalParts;

      // Read from central object and save to state
      const updates: Partial<StoryState> = {
        accumulatedCards: JSON.parse(currentValuesRef.current.cards),
        accumulatedSummary: currentValuesRef.current.summary,
        plotEssentials: currentValuesRef.current.plotEssentials,
        character: currentValuesRef.current.character,
        storyTitle: currentValuesRef.current.storyTitle,
        lastLine: result.last_line,
        currentPart: result.current_part,
        name: currentValuesRef.current.storyTitle || freshStory.name
      };

      console.log('[SAVE] Saving to state - summary:', updates.accumulatedSummary?.substring(0, 80), 'cards:', updates.accumulatedCards?.length || 0);
      updateCurrentStory(updates);

      if (hasMoreParts) {
        if (settings.requirePermissionBetweenParts) {
          setStatus(`Part ${result.current_part}/${totalParts} complete. Waiting for permission to continue...`);
          setWaitingForContinue(true);

          // Set up callback for continue button - use getCurrentStory to always get fresh state
          setContinueCallback(() => () => {
            setStatus(`Part ${result.current_part}/${totalParts} complete. Processing next part...`);
            processNextPart(zipPartsMap, result.current_part + 1, getCurrentStory, settings, updateCurrentStory, setStatus);
          });
        } else {
          setStatus(`Part ${result.current_part}/${totalParts} complete. Processing next part...`);
          await processNextPart(zipPartsMap, result.current_part + 1, getCurrentStory, settings, updateCurrentStory, setStatus);
        }
      } else {
        setStatus("Processing complete!");
        setIsProcessing(false);
      }
    } catch (error) {
      setStatus(`Error: ${error}`);
      setIsProcessing(false);
      throw error;
    }
  };

  const handleProcess = async (
    getCurrentStory: () => StoryState,
    currentStoryId: string,
    settings: ProcessorSettings,
    updateCurrentStory: (updates: Partial<StoryState>) => void,
    setStatus: (status: string) => void
  ) => {
    const currentStory = getCurrentStory();

    if (!currentStory.storyPath) {
      setStatus("Error: Story file is required");
      return;
    }
    if (!settings.openrouterKey) {
      setStatus("Error: OpenRouter API Key is required");
      return;
    }

    setIsProcessing(true);
    setStatus("Processing new content...");

    setTasks([]);
    setSelectedTask(null);

    try {
      const fileContent = await loadFileContent(
        currentStoryId,
        currentStory.storyPath,
        currentStory.isZipFile || false
      );

      const minContext = getMinimumContextLength(settings.taskModels, settings.modelContextLengths);
      const originalPartsCount = fileContent.zipParts?.size || 1;

      const processed = applySplitting(fileContent, minContext);

      if (processed.zipParts && originalPartsCount !== processed.zipParts.size) {
        const statusMsg = getSplitStatusMessage(originalPartsCount, processed.zipParts.size, minContext);
        setStatus(statusMsg);

        if (!currentStory.isZipFile && processed.isZipFile) {
          updateCurrentStory({ isZipFile: true, zipParts: processed.zipParts });
        }
      }

      await processNextPart(processed.zipParts, currentStory.currentPart || 1, getCurrentStory, settings, updateCurrentStory, setStatus);
    } catch (error) {
      setStatus(`Error: ${error}`);
      setIsProcessing(false);
    }
  };

  const retryTask = async (
    taskId: string,
    editedSystemPrompt: string | undefined,
    openrouterKey: string,
    modelConfigs: Record<string, ModelConfig>,
    onStoryUpdate: (taskId: string, result: string, storeRetryValue: (field: string, value: any) => void) => void,
    markRetried: (field: string) => void
  ) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.model || !task.userContent) {
      console.error("Task not found or missing required data for retry");
      return;
    }

    const systemPrompt = editedSystemPrompt || task.systemPrompt || "";

    // Update task to processing
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: 'processing' as const, output: "" } : t
    ));

    try {
      // Get model config
      const config = getModelConfig(task.model, modelConfigs);
      const options = {
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        topP: config.topP,
        topK: config.topK,
        frequencyPenalty: config.frequencyPenalty,
        presencePenalty: config.presencePenalty,
        thinkingEnabled: config.thinkingEnabled,
        reasoningEffort: config.reasoningEffort,
      };

      // Call API
      const result = await apiCallOpenRouter(
        openrouterKey,
        task.model,
        systemPrompt,
        task.userContent,
        options
      );

      // Update task with result
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, status: 'completed' as const, output: result } : t
      ));

      // Mark this task as retried so original callback is ignored
      retriedTaskIdsRef.current.add(taskId);
      console.log('[RETRY] Marked task as retried:', taskId);

      // Write to central object
      const storeRetryValue = (field: string, value: any) => {
        console.log('[WRITE] Retry updated', field, ':', typeof value === 'string' ? value.substring(0, 80) : value);
        (currentValuesRef.current as any)[field] = value;
      };
      onStoryUpdate(taskId, result, storeRetryValue);

      markRetried(taskId);
    } catch (error) {
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, status: 'error' as const, output: String(error) } : t
      ));
    }
  };

  return {
    tasks,
    selectedTask,
    setSelectedTask,
    isProcessing,
    waitingForContinue,
    handleContinue,
    handleProcess,
    retryTask,
  };
}
