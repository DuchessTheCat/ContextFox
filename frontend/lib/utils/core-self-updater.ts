/**
 * Handles updating card descriptions with core_self information
 */

import { StoryCard } from "../../types";

export function applyCoreSelfUpdates(
  cards: StoryCard[],
  updates: Array<{ title: string; core_self: string }>,
  isBrainCard: (card: StoryCard) => boolean
): StoryCard[] {
  return cards.map((card) => {
    const update = updates.find((u) => u.title === card.title);
    if (!update || !isBrainCard(card)) {
      return card;
    }

    let existingDesc = card.description || "";

    // Description is ALWAYS plain text - remove existing core_self if present at the start
    if (existingDesc.startsWith("core_self:")) {
      const blankLineMatch = existingDesc.match(/\n\s*\n/);
      if (blankLineMatch && blankLineMatch.index !== undefined) {
        // Remove everything from start up to and including the blank line
        existingDesc = existingDesc.substring(
          blankLineMatch.index + blankLineMatch[0].length
        );
      } else {
        // core_self: line exists but no blank line after - remove just the first line
        const newlineMatch = existingDesc.match(/\n/);
        if (newlineMatch && newlineMatch.index !== undefined) {
          existingDesc = existingDesc.substring(newlineMatch.index + 1);
        } else {
          // Only core_self line exists, nothing after
          existingDesc = "";
        }
      }
    }

    // Always add new core_self at the top with blank line after
    const newDescription = existingDesc
      ? `core_self: ${update.core_self}\n\n${existingDesc}`
      : `core_self: ${update.core_self}\n\n`;

    return { ...card, description: newDescription };
  });
}
