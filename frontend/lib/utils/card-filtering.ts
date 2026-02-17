/**
 * Handles filtering and categorization of story cards
 */

import { StoryCard } from "../../types";

export function isBrainCard(card: StoryCard): boolean {
  return (
    card.title.toLowerCase().includes("brain") ||
    (typeof card.type === "string" && card.type.toLowerCase() === "brain")
  );
}

export function isDefaultExcluded(card: StoryCard): boolean {
  return card.title.includes("Configure") || isBrainCard(card);
}

export function isExcluded(
  card: StoryCard,
  excludedCardTitles: string[],
  includedCardTitles: string[]
): boolean {
  // If explicitly included, override default exclusion
  if (includedCardTitles.includes(card.title)) {
    return false;
  }
  // Check if default excluded or user excluded
  return isDefaultExcluded(card) || excludedCardTitles.includes(card.title);
}

export function separateCards(
  cards: StoryCard[],
  excludedCardTitles: string[],
  includedCardTitles: string[]
): { excludedCards: StoryCard[]; regularCards: StoryCard[] } {
  const excludedCards = cards.filter((c) =>
    isExcluded(c, excludedCardTitles, includedCardTitles)
  );
  const regularCards = cards.filter(
    (c) => !isExcluded(c, excludedCardTitles, includedCardTitles)
  );

  return { excludedCards, regularCards };
}

export function mergeCards(
  existingCards: StoryCard[],
  newCards: StoryCard[]
): StoryCard[] {
  const merged = [...existingCards];

  for (const newCard of newCards) {
    const existing = merged.find((c) => c.title === newCard.title);
    if (existing) {
      // Only update fields that are present in newCard, keep old values for missing fields
      if (newCard.keys !== undefined) existing.keys = newCard.keys;
      if (newCard.value !== undefined) existing.value = newCard.value;
      if (newCard.type !== undefined) existing.type = newCard.type;
      if (newCard.description !== undefined) existing.description = newCard.description;
      if (newCard.core_self !== undefined) existing.core_self = newCard.core_self;
    } else {
      // New card - add it
      merged.push(newCard);
    }
  }

  return merged;
}

// For summary and plot essentials - minimal context
export function stripCardsForContext(cards: StoryCard[]): { title: string; value: string }[] {
  return cards.map((c) => ({ title: c.title, value: c.value }));
}

// For card generation tasks - includes keys and type
export function stripCardsForCardGeneration(cards: StoryCard[]): { title: string; keys: string; type?: string; value: string }[] {
  return cards.map((c) => ({ title: c.title, keys: c.keys, type: c.type, value: c.value }));
}

// For core self - includes description
export function stripCardsForCoreSelf(cards: StoryCard[]): { title: string; keys: string; type?: string; value: string; description?: string }[] {
  return cards.map((c) => ({ title: c.title, keys: c.keys, type: c.type, value: c.value, description: c.description }));
}
