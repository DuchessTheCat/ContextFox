/**
 * Main orchestrator for story processing workflow
 */

import { StoryCard, Task } from "../types";
import { callOpenRouter as apiCallOpenRouter, OpenRouterOptions } from "./api/api-client";
import { extractSingleFileContent, extractZipPartContent, getPartIndicator } from "./content/content-extraction";
import { separateCards, mergeCards, stripCardsForContext, stripCardsForCardGeneration, stripCardsForCoreSelf, isBrainCard } from "./utils/card-filtering";
import { preparePrompt, HARD_RULES } from "./utils/prompt-builder";
import { executePerspectiveAndTitle } from "./executors/perspective-title-executor";
import { executeCardGenerationTasks } from "./executors/card-generation-executor";
import { createTaskDefinitions } from "./utils/task-definitions";
import { executePlotEssentials } from "./executors/plot-essentials-executor";
import { executeCoreSelf } from "./executors/core-self-executor";
import { ModelConfig, getModelConfig } from "../types/modelConfig";

export interface StoryProcessorParams {
  storyContent: string;
  lastLineText: string;
  currentPart: number;
  isZipFile: boolean;
  zipParts?: Map<number, string>;
  getLastSummary: () => string;
  getLastCards: () => string;
  getLastPlotEssentials: () => string;
  getLastCharacter: () => string;
  getLastStoryTitle: () => string;
  excludedCardTitles: string[];
  includedCardTitles: string[];
  openrouterKey: string;
  storyModel: string;
  perspectiveModel: string;
  titleModel: string;
  charactersModel: string;
  locationsModel: string;
  conceptsModel: string;
  summaryModel: string;
  plotEssentialsModel: string;
  coreSelfModel: string;
  perspectivePrompt: string;
  titlePrompt: string;
  charactersPrompt: string;
  locationsPrompt: string;
  conceptsPrompt: string;
  summaryPrompt: string;
  plotEssentialsPrompt: string;
  plotEssentialsWithContextPrompt: string;
  coreSelfPrompt: string;
  refusalPrompt: string;
  modelConfigs: Record<string, ModelConfig>;
  onTaskUpdate: (update: Partial<Task>) => void;
  onTaskComplete?: (taskId: string, taskType: string, parsedResult: any) => void;
}

export interface StoryProcessorResult {
  story_cards: string;
  summary: string;
  plot_essentials: string;
  last_line: string;
  current_part: number;
  character: string;
  story_title: string;
}

function callOpenRouter(
  apiKey: string,
  model: string,
  prompt: string,
  content: string,
  options?: OpenRouterOptions
): Promise<string> {
  return apiCallOpenRouter(apiKey, model, prompt, content, options);
}

function modelConfigToOptions(config: ModelConfig): OpenRouterOptions {
  return {
    temperature: config.temperature,
    maxTokens: config.maxTokens,
    topP: config.topP,
    topK: config.topK,
    frequencyPenalty: config.frequencyPenalty,
    presencePenalty: config.presencePenalty,
    thinkingEnabled: config.thinkingEnabled,
    reasoningEffort: config.reasoningEffort,
  };
}

export async function processStory(params: StoryProcessorParams): Promise<StoryProcessorResult> {
  const {
    storyContent: storyContentFull,
    lastLineText,
    currentPart,
    isZipFile,
    zipParts,
    getLastSummary,
    getLastCards,
    getLastPlotEssentials,
    getLastCharacter,
    getLastStoryTitle,
    excludedCardTitles,
    includedCardTitles,
    openrouterKey,
    storyModel,
    perspectiveModel,
    titleModel,
    charactersModel,
    locationsModel,
    conceptsModel,
    summaryModel,
    plotEssentialsModel,
    coreSelfModel,
    perspectivePrompt,
    titlePrompt,
    charactersPrompt,
    locationsPrompt,
    conceptsPrompt,
    summaryPrompt,
    plotEssentialsPrompt,
    plotEssentialsWithContextPrompt,
    coreSelfPrompt,
    refusalPrompt,
    modelConfigs,
    onTaskUpdate,
    onTaskComplete,
  } = params;

  // Get initial values
  let lastSummary = getLastSummary();
  let lastCards = getLastCards();
  let lastPlotEssentials = getLastPlotEssentials();
  let lastCharacter = getLastCharacter();
  let lastStoryTitle = getLastStoryTitle();

  // Create a model-aware callOpenRouter wrapper
  const callOpenRouterWithConfig = (
    key: string,
    model: string,
    prompt: string,
    content: string
  ): Promise<string> => {
    const config = getModelConfig(model, modelConfigs);
    const options = modelConfigToOptions(config);
    return callOpenRouter(key, model, prompt, content, options);
  };

  // Extract content
  const extraction = isZipFile && zipParts
    ? extractZipPartContent(zipParts, currentPart, lastLineText)
    : extractSingleFileContent(storyContentFull, lastLineText);

  const storyContent = extraction.content;
  const newLastLine = extraction.newLastLine;
  const newPart = extraction.newPart;
  const partIndicator = getPartIndicator(isZipFile, zipParts, currentPart);

  // Parse and separate existing cards first (needed for variables)
  const oldCards: StoryCard[] = (() => {
    try {
      return JSON.parse(lastCards);
    } catch {
      return [];
    }
  })();

  const { regularCards } = separateCards(oldCards, excludedCardTitles, includedCardTitles);

  // Different card contexts for different tasks (used for perspective/title if needed)
  const cardsMinimal = JSON.stringify(stripCardsForContext(regularCards), null, 2);

  // Build base variables object
  let character = lastCharacter;
  let storyTitle = lastStoryTitle;
  const baseVariables = { storyModel, character, storyTitle, lastSummary, lastPlotEssentials };

  // Detect perspective and title (only on part 1) - uses minimal cards
  if (currentPart === 1 && (!lastCharacter || !lastStoryTitle)) {
    const result = await executePerspectiveAndTitle(
      storyContent,
      lastCharacter,
      lastStoryTitle,
      preparePrompt(perspectivePrompt, HARD_RULES.PERSPECTIVE, { ...baseVariables, cardsContext: cardsMinimal }),
      preparePrompt(titlePrompt, HARD_RULES.TITLE, { ...baseVariables, cardsContext: cardsMinimal }),
      perspectiveModel,
      titleModel,
      openrouterKey,
      refusalPrompt,
      onTaskUpdate,
      callOpenRouterWithConfig
    );

    character = result.character;
    storyTitle = result.storyTitle;

    // Update base variables with newly detected character/title
    baseVariables.character = character;
    baseVariables.storyTitle = storyTitle;
  }

  // Re-read fresh values before building prompts (in case retry happened)
  lastSummary = getLastSummary();
  lastCards = getLastCards();
  lastPlotEssentials = getLastPlotEssentials();
  lastCharacter = getLastCharacter() || character;
  lastStoryTitle = getLastStoryTitle() || storyTitle;

  // Update base variables with fresh values
  baseVariables.lastSummary = lastSummary;
  baseVariables.lastPlotEssentials = lastPlotEssentials;
  baseVariables.character = lastCharacter;
  baseVariables.storyTitle = lastStoryTitle;

  // Parse fresh cards
  const freshOldCards: StoryCard[] = (() => {
    try {
      return JSON.parse(lastCards);
    } catch {
      return oldCards;
    }
  })();
  const { excludedCards: freshExcludedCards, regularCards: freshRegularCards } = separateCards(freshOldCards, excludedCardTitles, includedCardTitles);

  // Helper to get filtered cards context
  const getCardsForCardGeneration = () => {
    try {
      const cards = JSON.parse(getLastCards());
      const { regularCards } = separateCards(cards, excludedCardTitles, includedCardTitles);
      return JSON.stringify(stripCardsForCardGeneration(regularCards), null, 2);
    } catch {
      return '[]';
    }
  };

  const getCardsMinimal = () => {
    try {
      const cards = JSON.parse(getLastCards());
      const { regularCards } = separateCards(cards, excludedCardTitles, includedCardTitles);
      return JSON.stringify(stripCardsForContext(regularCards), null, 2);
    } catch {
      return '[]';
    }
  };

  // Generate cards and summary - all results written via onTaskComplete callback
  await executeCardGenerationTasks(
    createTaskDefinitions(
      {
        characters: () => {
          const vars = {
            storyModel,
            character: getLastCharacter() || character,
            storyTitle: getLastStoryTitle() || storyTitle,
            lastSummary: getLastSummary(),
            lastPlotEssentials: getLastPlotEssentials(),
            cardsContext: getCardsForCardGeneration()
          };
          return preparePrompt(charactersPrompt, HARD_RULES.CARDS, vars);
        },
        locations: () => {
          const vars = {
            storyModel,
            character: getLastCharacter() || character,
            storyTitle: getLastStoryTitle() || storyTitle,
            lastSummary: getLastSummary(),
            lastPlotEssentials: getLastPlotEssentials(),
            cardsContext: getCardsForCardGeneration()
          };
          return preparePrompt(locationsPrompt, HARD_RULES.CARDS, vars);
        },
        concepts: () => {
          const vars = {
            storyModel,
            character: getLastCharacter() || character,
            storyTitle: getLastStoryTitle() || storyTitle,
            lastSummary: getLastSummary(),
            lastPlotEssentials: getLastPlotEssentials(),
            cardsContext: getCardsForCardGeneration()
          };
          return preparePrompt(conceptsPrompt, HARD_RULES.CARDS, vars);
        },
        summary: () => {
          const vars = {
            storyModel,
            character: getLastCharacter() || character,
            storyTitle: getLastStoryTitle() || storyTitle,
            lastSummary: getLastSummary(),
            lastPlotEssentials: getLastPlotEssentials(),
            cardsContext: getCardsMinimal()
          };
          return preparePrompt(summaryPrompt, HARD_RULES.SUMMARY, vars);
        },
      },
      { characters: charactersModel, locations: locationsModel, concepts: conceptsModel, summary: summaryModel },
      partIndicator
    ),
    storyContent,
    getLastSummary,
    openrouterKey,
    refusalPrompt,
    onTaskUpdate,
    callOpenRouterWithConfig,
    onTaskComplete
  );

  // Cards are now in central object via onTaskComplete - read from getLastCards
  const aiGeneratedCards = JSON.parse(getLastCards());
  const finalCards = [...mergeCards(freshRegularCards, aiGeneratedCards), ...freshExcludedCards];

  // Execute plot essentials and core self in parallel
  const parallelTasks: Promise<{ type: "plot" | "coreSelf"; result: any }>[] = [];

  if (plotEssentialsModel !== "None") {
    // Check if we have existing plot essentials (non-empty and not just whitespace)
    const hasExistingPlotEssentials = lastPlotEssentials && lastPlotEssentials.trim().length > 0;

    // Plot essentials uses minimal card context
    const cardsMinimalUpdated = JSON.stringify(stripCardsForContext(finalCards), null, 2);
    const plotPrompt = preparePrompt(
      hasExistingPlotEssentials ? plotEssentialsWithContextPrompt : plotEssentialsPrompt,
      HARD_RULES.PLOT_ESSENTIALS,
      { ...baseVariables, cardsContext: cardsMinimalUpdated }
    );

    parallelTasks.push(
      executePlotEssentials(
        storyContent,
        lastPlotEssentials,
        plotPrompt,
        plotPrompt,
        plotEssentialsModel,
        openrouterKey,
        refusalPrompt,
        partIndicator,
        onTaskUpdate,
        callOpenRouterWithConfig
      ).then((result) => ({ type: "plot" as const, result }))
    );
  }

  if (coreSelfModel !== "None") {
    // Core self uses full card context INCLUDING description
    const cardsForCoreSelfContext = JSON.stringify(stripCardsForCoreSelf(finalCards), null, 2);
    const preparedCoreSelfPrompt = preparePrompt(
      coreSelfPrompt,
      "", // Don't add hard rules here - executor adds them
      { ...baseVariables, cardsContext: cardsForCoreSelfContext }
    );

    parallelTasks.push(
      executeCoreSelf(
        storyContent,
        finalCards,
        getLastSummary(),
        preparedCoreSelfPrompt,
        coreSelfModel,
        openrouterKey,
        refusalPrompt,
        partIndicator,
        isBrainCard,
        onTaskUpdate,
        callOpenRouterWithConfig
      ).then((result) => ({ type: "coreSelf" as const, result }))
    );
  }

  const results = await Promise.all(parallelTasks);

  let newPlotEssentials = lastPlotEssentials;
  let updatedFinalCards = finalCards;

  for (const result of results) {
    if (result.type === "plot") {
      newPlotEssentials = result.result;
      // Store in callback so retry detection works
      if (onTaskComplete) {
        onTaskComplete('plot-essentials', 'plotEssentials', newPlotEssentials);
      }
    } else if (result.type === "coreSelf") {
      updatedFinalCards = result.result;
      // Core self updates cards, already handled by card onTaskComplete
    }
  }

  // Return ONLY metadata - all actual data is in central object via callbacks
  return {
    story_cards: JSON.stringify(updatedFinalCards, null, 2),
    summary: getLastSummary(),
    plot_essentials: getLastPlotEssentials(),
    last_line: newLastLine,
    current_part: newPart,
    character: getLastCharacter(),
    story_title: getLastStoryTitle(),
  };
}
