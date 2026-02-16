/**
 * Handles building and preparing prompts with variable substitution
 */

export const HARD_RULES = {
  PERSPECTIVE: '\n\nReturn ONLY a JSON object in this format: { "character": "name" }',
  TITLE: '\n\nReturn ONLY a JSON object in this format: { "title": "..." }',
  CARDS: '\n\nReturn ONLY a JSON object with a "cards" key containing an array of story cards. For each card, use "value" for the description. Format: { "cards": [ { "keys": "trigger1, trigger2", "value": "Detailed description of what this is", "type": "character/location/concept/faction", "title": "Name" } ] }',
  SUMMARY: '\n\nReturn ONLY a JSON object with the complete "summary" key containing the text of the final summary (ALWAYS include the current summary in that): { "summary": "..." }',
  PLOT_ESSENTIALS: '\n\nReturn ONLY a JSON object in this format: { "plotEssentials": "..." }',
  CORE_SELF: '\n\nReturn ONLY a JSON object in this format: { "coreSelfUpdates": [ { "title": "exact card title", "core_self": "2-5 sentence description" } ] }',
};

export function preparePrompt(
  prompt: string,
  hardRules: string,
  variables: {
    storyModel?: string;
    character?: string;
    storyTitle?: string;
    lastSummary?: string;
    lastPlotEssentials?: string;
    cardsContext?: string;
  }
): string {
  let prepared = prompt
    .replace(/\$model/g, variables.storyModel || "")
    .replace(/\$character/g, variables.character || "")
    .replace(/\$storyTitle/g, variables.storyTitle || "")
    .replace(/\$lastSummary/g, variables.lastSummary || "")
    .replace(/\$lastPlotEssentials/g, variables.lastPlotEssentials || "")
    .replace(/\$cards/g, variables.cardsContext || "");

  return prepared + hardRules;
}
