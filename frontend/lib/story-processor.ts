/**
 * Main orchestrator for story processing workflow
 */

import { StoryCard, Task } from "../types";
import { callOpenRouter as apiCallOpenRouter } from "./api/api-client";
import { extractSingleFileContent, extractZipPartContent, getPartIndicator } from "./content/content-extraction";
import { separateCards, mergeCards, stripCardsForContext, isBrainCard } from "./utils/card-filtering";
import { preparePrompt, HARD_RULES } from "./utils/prompt-builder";
import { executePerspectiveAndTitle } from "./executors/perspective-title-executor";
import { executeCardGenerationTasks } from "./executors/card-generation-executor";
import { createTaskDefinitions } from "./utils/task-definitions";
import { executePlotEssentials } from "./executors/plot-essentials-executor";
import { executeCoreSelf } from "./executors/core-self-executor";

export interface StoryProcessorParams {
  storyContent: string;
  lastLineText: string;
  currentPart: number;
  isZipFile: boolean;
  zipParts?: Map<number, string>;
  lastSummary: string;
  lastCards: string;
  lastPlotEssentials: string;
  lastCharacter: string;
  lastStoryTitle: string;
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
  onTaskUpdate: (update: Partial<Task>) => void;
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
  content: string
): Promise<string> {
  return apiCallOpenRouter(apiKey, model, prompt, content);
}

export async function processStory(params: StoryProcessorParams): Promise<StoryProcessorResult> {
  const {
    storyContent: storyContentFull,
    lastLineText,
    currentPart,
    isZipFile,
    zipParts,
    lastSummary,
    lastCards,
    lastPlotEssentials,
    lastCharacter,
    lastStoryTitle,
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
    onTaskUpdate,
  } = params;

  // Extract content
  const extraction = isZipFile && zipParts
    ? extractZipPartContent(zipParts, currentPart, lastLineText)
    : extractSingleFileContent(storyContentFull, lastLineText);

  const storyContent = extraction.content;
  const newLastLine = extraction.newLastLine;
  const newPart = extraction.newPart;
  const partIndicator = getPartIndicator(isZipFile, zipParts, currentPart);

  // Detect perspective and title (only on part 1)
  let character = lastCharacter;
  let storyTitle = lastStoryTitle;

  if (currentPart === 1 && (!lastCharacter || !lastStoryTitle)) {
    const result = await executePerspectiveAndTitle(
      storyContent,
      lastCharacter,
      lastStoryTitle,
      preparePrompt(perspectivePrompt, HARD_RULES.PERSPECTIVE, {}),
      preparePrompt(titlePrompt, HARD_RULES.TITLE, {}),
      perspectiveModel,
      titleModel,
      openrouterKey,
      refusalPrompt,
      onTaskUpdate,
      callOpenRouter
    );

    character = result.character;
    storyTitle = result.storyTitle;
  }

  // Parse and separate existing cards
  const oldCards: StoryCard[] = (() => {
    try {
      return JSON.parse(lastCards);
    } catch {
      return [];
    }
  })();

  const { excludedCards, regularCards } = separateCards(oldCards, excludedCardTitles, includedCardTitles);
  const cardsContext = JSON.stringify(stripCardsForContext(regularCards), null, 2);

  const variables = { storyModel, character, storyTitle, lastSummary, lastPlotEssentials, cardsContext };

  // Generate cards and summary
  const { cards: aiGeneratedCards, summary: newSummary } = await executeCardGenerationTasks(
    createTaskDefinitions(
      {
        characters: preparePrompt(charactersPrompt, HARD_RULES.CARDS, variables),
        locations: preparePrompt(locationsPrompt, HARD_RULES.CARDS, variables),
        concepts: preparePrompt(conceptsPrompt, HARD_RULES.CARDS, variables),
        summary: preparePrompt(summaryPrompt, HARD_RULES.SUMMARY, variables),
      },
      { characters: charactersModel, locations: locationsModel, concepts: conceptsModel, summary: summaryModel },
      partIndicator
    ),
    storyContent,
    lastSummary,
    openrouterKey,
    refusalPrompt,
    onTaskUpdate,
    callOpenRouter
  );

  const finalCards = [...mergeCards(regularCards, aiGeneratedCards), ...excludedCards];

  // Execute plot essentials and core self in parallel
  const parallelTasks: Promise<{ type: "plot" | "coreSelf"; result: any }>[] = [];

  if (plotEssentialsModel !== "None") {
    const plotPrompt = preparePrompt(
      lastPlotEssentials?.trim() ? plotEssentialsWithContextPrompt : plotEssentialsPrompt,
      "",
      variables
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
        callOpenRouter
      ).then((result) => ({ type: "plot" as const, result }))
    );
  }

  if (coreSelfModel !== "None") {
    parallelTasks.push(
      executeCoreSelf(
        storyContent,
        finalCards,
        newSummary,
        coreSelfPrompt,
        coreSelfModel,
        openrouterKey,
        refusalPrompt,
        partIndicator,
        isBrainCard,
        onTaskUpdate,
        callOpenRouter
      ).then((result) => ({ type: "coreSelf" as const, result }))
    );
  }

  const results = await Promise.all(parallelTasks);

  let newPlotEssentials = lastPlotEssentials;
  let updatedFinalCards = finalCards;

  for (const result of results) {
    if (result.type === "plot") {
      newPlotEssentials = result.result;
    } else if (result.type === "coreSelf") {
      updatedFinalCards = result.result;
    }
  }

  return {
    story_cards: JSON.stringify(updatedFinalCards, null, 2),
    summary: newSummary,
    plot_essentials: newPlotEssentials,
    last_line: newLastLine,
    current_part: newPart,
    character,
    story_title: storyTitle,
  };
}
