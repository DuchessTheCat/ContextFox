/**
 * Hook for story processing operations
 */

import { useState } from "react";
import { Task, StoryState } from "../types";
import { processStory } from "../lib/story-processor";
import { loadFileContent } from "../lib/content/file-operations";
import { applySplitting, getMinimumContextLength, getSplitStatusMessage } from "../lib/content/context-splitting";
import { getUnderlyingModel } from "../lib/model-mapping";

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
}

export function useStoryProcessor() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const processNextPart = async (
    zipPartsMap: Map<number, string> | undefined,
    partToProcess: number,
    currentStory: StoryState,
    settings: ProcessorSettings,
    updateCurrentStory: (updates: Partial<StoryState>) => void,
    setStatus: (status: string) => void
  ): Promise<void> => {
    try {
      const underlyingModel = getUnderlyingModel(settings.storyModel);

      const result = await processStory({
        storyContent: "",
        lastLineText: currentStory.lastLine,
        currentPart: partToProcess,
        isZipFile: currentStory.isZipFile || false,
        zipParts: zipPartsMap,
        lastSummary: currentStory.accumulatedSummary,
        lastCards: JSON.stringify(currentStory.accumulatedCards),
        lastPlotEssentials: currentStory.plotEssentials || "",
        lastCharacter: currentStory.character,
        lastStoryTitle: currentStory.storyTitle,
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

      const totalParts = zipPartsMap instanceof Map ? zipPartsMap.size : 1;
      const hasMoreParts = currentStory.isZipFile && result.current_part < totalParts;

      const updates: Partial<StoryState> = {
        accumulatedCards: updatedCards,
        accumulatedSummary: updatedSummary,
        plotEssentials: result.plot_essentials,
        lastLine: result.last_line,
        currentPart: result.current_part,
        character: result.character,
        storyTitle: result.story_title,
        name: result.story_title || currentStory.name
      };

      updateCurrentStory(updates);

      if (hasMoreParts) {
        setStatus(`Part ${result.current_part}/${totalParts} complete. Processing next part...`);
        await processNextPart(zipPartsMap, result.current_part + 1, currentStory, settings, updateCurrentStory, setStatus);
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
    currentStory: StoryState,
    currentStoryId: string,
    settings: ProcessorSettings,
    updateCurrentStory: (updates: Partial<StoryState>) => void,
    setStatus: (status: string) => void
  ) => {
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

      await processNextPart(processed.zipParts, currentStory.currentPart || 1, currentStory, settings, updateCurrentStory, setStatus);
    } catch (error) {
      setStatus(`Error: ${error}`);
      setIsProcessing(false);
    }
  };

  return {
    tasks,
    selectedTask,
    setSelectedTask,
    isProcessing,
    handleProcess,
  };
}
