/**
 * Hook for managing global settings
 */

import { useState } from "react";
import { DEFAULT_PROMPTS, DEFAULT_REFUSAL_PROMPT } from "../config/prompts";
import { DEFAULT_TASK_MODELS, DEFAULT_STORY_MODEL } from "../config/models";

export function useSettings() {
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [storyModel, setStoryModel] = useState(DEFAULT_STORY_MODEL);
  const [taskModels, setTaskModels] = useState(DEFAULT_TASK_MODELS);
  const [selectedPreset, setSelectedPreset] = useState<string | null>("default");
  const [customPresets, setCustomPresets] = useState<Record<string, any>>({});
  const [prompts, setPrompts] = useState(DEFAULT_PROMPTS);
  const [refusalPrompt, setRefusalPrompt] = useState(DEFAULT_REFUSAL_PROMPT);
  const [modelContextLengths, setModelContextLengths] = useState<Record<string, number>>({});
  const [requirePermissionBetweenParts, setRequirePermissionBetweenParts] = useState(false);

  return {
    openrouterKey,
    setOpenrouterKey,
    storyModel,
    setStoryModel,
    taskModels,
    setTaskModels,
    selectedPreset,
    setSelectedPreset,
    customPresets,
    setCustomPresets,
    prompts,
    setPrompts,
    refusalPrompt,
    setRefusalPrompt,
    modelContextLengths,
    setModelContextLengths,
    requirePermissionBetweenParts,
    setRequirePermissionBetweenParts,
  };
}
