/**
 * Hook for card exclusion/inclusion toggle logic
 */

import { StoryState } from "../types";

export function useCardToggle(
  currentStory: StoryState,
  updateCurrentStory: (updates: Partial<StoryState>) => void
) {
  function handleToggleExclude(title: string) {
    const card = currentStory.accumulatedCards.find(c => c.title === title);
    if (!card) return;

    const isBrainCard = card.title.toLowerCase().includes("brain") || (card.type && card.type.toLowerCase() === "brain");
    const isDefaultExcluded = card.title.includes("Configure") || isBrainCard;

    const currentExcluded = currentStory.excludedCardTitles || [];
    const currentIncluded = currentStory.includedCardTitles || [];

    if (isDefaultExcluded) {
      // Toggle default excluded card via included list
      if (currentIncluded.includes(title)) {
        // Remove from included (back to excluded)
        updateCurrentStory({ includedCardTitles: currentIncluded.filter(t => t !== title) });
      } else {
        // Add to included
        updateCurrentStory({ includedCardTitles: [...currentIncluded, title] });
      }
    } else {
      // Toggle regular card via excluded list
      if (currentExcluded.includes(title)) {
        updateCurrentStory({ excludedCardTitles: currentExcluded.filter(t => t !== title) });
      } else {
        updateCurrentStory({ excludedCardTitles: [...currentExcluded, title] });
      }
    }
  }

  return { handleToggleExclude };
}
