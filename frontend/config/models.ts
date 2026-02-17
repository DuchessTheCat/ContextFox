/**
 * Model configuration and presets
 * Edit these to customize which AI models are used for different tasks
 */

export const MODEL_PRESETS = {
  cheap: {
    perspective: "google/gemini-2.5-flash-lite",
    title: "google/gemini-2.5-flash-lite",
    characters: "deepseek/deepseek-v3.1-terminus",
    locations: "deepseek/deepseek-v3.1-terminus",
    concepts: "deepseek/deepseek-v3.1-terminus",
    summary: "deepseek/deepseek-v3.1-terminus",
    plotEssentials: "deepseek/deepseek-v3.1-terminus",
    coreSelf: "deepseek/deepseek-v3.1-terminus",
  },
  default: {
    perspective: "google/gemini-2.5-flash-lite",
    title: "google/gemini-2.5-flash-lite",
    characters: "deepseek/deepseek-v3.2-exp",
    locations: "deepseek/deepseek-v3.2-exp",
    concepts: "deepseek/deepseek-v3.2-exp",
    summary: "deepseek/deepseek-v3.2-exp",
    plotEssentials: "deepseek/deepseek-v3.2-exp",
    coreSelf: "deepseek/deepseek-v3.1-terminus",
  },
  expensive: {
    perspective: "google/gemini-2.5-flash-lite",
    title: "google/gemini-2.5-flash-lite",
    characters: "google/gemini-3-flash-preview",
    locations: "google/gemini-3-flash-preview",
    concepts: "google/gemini-2.5-flash",
    summary: "google/gemini-3-pro-preview",
    plotEssentials: "google/gemini-3-flash-preview",
    coreSelf: "google/gemini-2.5-flash",
  },
  veryExpensive: {
    perspective: "google/gemini-2.5-flash-lite",
    title: "google/gemini-2.5-flash-lite",
    characters: "anthropic/claude-sonnet-4.5",
    locations: "google/gemini-3-flash-preview",
    concepts: "google/gemini-2.5-flash",
    summary: "anthropic/claude-sonnet-4.5",
    plotEssentials: "google/gemini-3-pro-preview",
    coreSelf: "google/gemini-2.5-flash",
  },
};

export const DEFAULT_TASK_MODELS = MODEL_PRESETS.default;

export const DEFAULT_STORY_MODEL = "Raven";

// Available AI Dungeon models (for story generation compatibility)
export const AID_MODELS = [
  // Small Models (12B)
  "Muse",
  "Wayfarer Small 2",
  "Madness",
  // Medium Models (24B)
  "Hearthfire",
  "Harbinger",
  // Large Models (70B)
  "Nova",
  "Wayfarer Large",
  "Hermes 3 70B",
  // Very Large Models
  "Raven",
  "Raven Prime",
  "Dragon",
  "Goliath",
];
