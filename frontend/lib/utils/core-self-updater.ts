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

    // Try parsing as JSON first
    try {
      const descJson = JSON.parse(existingDesc);
      if (typeof descJson === "object" && descJson !== null) {
        descJson.core_self = update.core_self;
        return { ...card, description: JSON.stringify(descJson) };
      }
    } catch (e) {
      // Not JSON, treat as plain text
    }

    // Plain text description - remove existing core_self if present
    if (existingDesc.startsWith("core_self:")) {
      const blankLineMatch = existingDesc.match(/\n\s*\n/);
      if (blankLineMatch && blankLineMatch.index !== undefined) {
        existingDesc = existingDesc.substring(
          blankLineMatch.index + blankLineMatch[0].length
        );
      } else {
        existingDesc = "";
      }
    }

    // Add new core_self at the top
    const newDescription = existingDesc
      ? `core_self: ${update.core_self}\n\n${existingDesc}`
      : `core_self: ${update.core_self}`;

    return { ...card, description: newDescription };
  });
}
