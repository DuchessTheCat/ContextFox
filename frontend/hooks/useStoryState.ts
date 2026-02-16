/**
 * Hook for managing story state
 */

import { useState } from "react";
import { StoryState } from "../types";
import { deleteFileContents } from "../lib/storage";

export function useStoryState() {
  const [stories, setStories] = useState<Record<string, StoryState>>({
    default: {
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
      includedCardTitles: [],
    },
  });
  const [currentStoryId, setCurrentStoryId] = useState("default");

  const currentStory = stories[currentStoryId] || stories["default"];

  const updateCurrentStory = (updates: Partial<StoryState>) => {
    setStories((prev) => {
      const story = { ...prev[currentStoryId], ...updates };

      // Convert zipParts Map to plain object for storage
      if (story.zipParts && story.zipParts instanceof Map) {
        story.zipParts = Object.fromEntries(story.zipParts) as any;
      }

      return {
        ...prev,
        [currentStoryId]: story,
      };
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
      includedCardTitles: [],
    };
    setStories((prev) => ({ ...prev, [id]: newStory }));
    setCurrentStoryId(id);
  };

  const deleteStory = async (id: string) => {
    if (Object.keys(stories).length <= 1) return;

    await deleteFileContents(id);

    setStories((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (currentStoryId === id) {
      setCurrentStoryId(Object.keys(stories).find((k) => k !== id) || "default");
    }
  };

  return {
    stories,
    setStories,
    currentStoryId,
    setCurrentStoryId,
    currentStory,
    updateCurrentStory,
    createNewStory,
    deleteStory,
  };
}
