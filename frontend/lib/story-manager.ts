import { StoryState } from "../types";
import { saveFileContents, deleteFileContents } from "./storage";

/**
 * Story state management functions
 * Handles creating, updating, and deleting stories
 */

export function createNewStoryState(id: string, name: string): StoryState {
  return {
    id,
    name,
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
}

export function updateStoryInCollection(
  stories: Record<string, StoryState>,
  storyId: string,
  updates: Partial<StoryState>
): Record<string, StoryState> {
  return {
    ...stories,
    [storyId]: {
      ...stories[storyId],
      ...updates
    }
  };
}

export async function deleteStoryState(storyId: string): Promise<void> {
  await deleteFileContents(storyId);
}

export async function saveStoryFileContents(
  storyId: string,
  data: { storyContent?: string; zipParts?: Map<number, string>; cardsContent?: string }
): Promise<void> {
  const toSave: any = {};

  if (data.storyContent) {
    toSave.storyContent = data.storyContent;
  }

  if (data.zipParts) {
    toSave.zipParts = Object.fromEntries(data.zipParts);
  }

  if (data.cardsContent) {
    toSave.cardsContent = data.cardsContent;
  }

  await saveFileContents(storyId, toSave);
}
