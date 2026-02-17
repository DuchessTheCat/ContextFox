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

  // Track which fields were updated via retry during processing
  const retriedFieldsRef = useRef<Set<string>>(new Set());

  // Store retry values directly so they're immediately readable (not async like React state)
  const retriedValuesRef = useRef<{
    summary?: string;
    cards?: string;
    plotEssentials?: string;
    character?: string;
    storyTitle?: string;
  }>({});

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

    // Clear retry tracking for this processing run
    retriedFieldsRef.current.clear();

    try {
      const underlyingModel = getUnderlyingModel(settings.storyModel);

      const result = await processStory({
        storyContent: "",
        lastLineText: currentStory.lastLine,
        currentPart: partToProcess,
        isZipFile: currentStory.isZipFile || false,
        zipParts: zipPartsMap,
        getLastSummary: () => retriedValuesRef.current.summary || getCurrentStory().accumulatedSummary,
        getLastCards: () => retriedValuesRef.current.cards || JSON.stringify(getCurrentStory().accumulatedCards),
        getLastPlotEssentials: () => retriedValuesRef.current.plotEssentials || getCurrentStory().plotEssentials || "",
        getLastCharacter: () => retriedValuesRef.current.character || getCurrentStory().character,
        getLastStoryTitle: () => retriedValuesRef.current.storyTitle || getCurrentStory().storyTitle,
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
          console.log('onTaskComplete called:', taskId, taskType, typeof parsedResult);
          if (taskType === 'plotEssentials') {
            retriedValuesRef.current.plotEssentials = parsedResult;
            console.log('Stored plotEssentials in ref:', parsedResult?.substring(0, 100));
          } else if (taskType === 'summary') {
            retriedValuesRef.current.summary = parsedResult;
            console.log('Stored summary in ref:', parsedResult?.substring(0, 100));
          } else if (taskType === 'cards') {
            retriedValuesRef.current.cards = JSON.stringify(parsedResult);
            console.log('Stored cards in ref, count:', parsedResult.length);
          }
        }
      });

      // Get fresh state to check for retry updates
      const freshStory = getCurrentStory();

      const updatedCards = JSON.parse(result.story_cards);
      const updatedSummary = result.summary;

      const totalParts = zipPartsMap instanceof Map ? zipPartsMap.size : 1;
      const hasMoreParts = freshStory.isZipFile && result.current_part < totalParts;

      // Check retry tracking ref to see which fields were retried
      const summaryRetried = retriedFieldsRef.current.has('summary');
      const cardsRetried = retriedFieldsRef.current.has('cards');
      const plotRetried = retriedFieldsRef.current.has('plot');
      const characterRetried = retriedFieldsRef.current.has('character');
      const titleRetried = retriedFieldsRef.current.has('title');

      console.log('Retry detection:', { summaryRetried, cardsRetried, plotRetried, characterRetried, titleRetried });
      console.log('retriedValuesRef.current:', {
        summary: retriedValuesRef.current.summary?.substring(0, 100),
        cards: retriedValuesRef.current.cards ? 'present' : 'missing',
        plotEssentials: retriedValuesRef.current.plotEssentials?.substring(0, 100),
        character: retriedValuesRef.current.character,
        storyTitle: retriedValuesRef.current.storyTitle,
      });
      console.log('updatedSummary:', updatedSummary?.substring(0, 100));

      const updates: Partial<StoryState> = {
        accumulatedCards: cardsRetried ? JSON.parse(retriedValuesRef.current.cards || '[]') : updatedCards,
        accumulatedSummary: summaryRetried ? retriedValuesRef.current.summary : updatedSummary,
        plotEssentials: plotRetried ? retriedValuesRef.current.plotEssentials : result.plot_essentials,
        character: characterRetried ? retriedValuesRef.current.character : result.character,
        storyTitle: titleRetried ? retriedValuesRef.current.storyTitle : result.story_title,
        lastLine: result.last_line,
        currentPart: result.current_part,
        name: (titleRetried ? retriedValuesRef.current.storyTitle : result.story_title) || freshStory.name
      };

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

      // Mark which field was retried so we can preserve it at the end
      const baseTaskId = taskId.split(' ')[0]; // Strip part number
      if (baseTaskId === 'summary') retriedFieldsRef.current.add('summary');
      else if (baseTaskId === 'characters' || baseTaskId === 'locations' || baseTaskId === 'concepts') retriedFieldsRef.current.add('cards');
      else if (baseTaskId === 'plot-essentials') retriedFieldsRef.current.add('plot');
      else if (baseTaskId === 'perspective') retriedFieldsRef.current.add('character');
      else if (baseTaskId === 'title') retriedFieldsRef.current.add('title');

      console.log('Marked retried:', baseTaskId, 'Current set:', Array.from(retriedFieldsRef.current));

      // Apply story updates based on task type AND store in ref
      const storeRetryValue = (field: string, value: any) => {
        console.log('Storing retry value in ref:', field, typeof value === 'string' ? value.substring(0, 100) : value);
        (retriedValuesRef.current as any)[field] = value;
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
