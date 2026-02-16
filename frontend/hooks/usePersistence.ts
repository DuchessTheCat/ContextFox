/**
 * Hook for persisting settings to Tauri store or localStorage
 */

import { useEffect, useCallback } from "react";
import { load } from "@tauri-apps/plugin-store";
import { IS_TAURI } from "../lib/utils";
import { StoryState } from "../types";

export interface PersistedSettings {
  openrouterKey: string;
  storyModel: string;
  taskModels: {
    perspective: string;
    title: string;
    characters: string;
    locations: string;
    concepts: string;
    summary: string;
    plotEssentials: string;
    coreSelf: string;
  };
  prompts: {
    perspective: string;
    title: string;
    characters: string;
    locations: string;
    concepts: string;
    summary: string;
    plotEssentials: string;
    plotEssentialsWithContext: string;
    coreSelf: string;
  };
  refusalPrompt: string;
  stories: Record<string, StoryState>;
  currentStoryId: string;
  customPresets: Record<string, any>;
  selectedPreset: string | null;
}

export function usePersistence(
  settings: PersistedSettings,
  setters: {
    setOpenrouterKey: (key: string) => void;
    setStoryModel: (model: string) => void;
    setTaskModels: (models: PersistedSettings["taskModels"] | ((prev: PersistedSettings["taskModels"]) => PersistedSettings["taskModels"])) => void;
    setPrompts: (prompts: PersistedSettings["prompts"] | ((prev: PersistedSettings["prompts"]) => PersistedSettings["prompts"])) => void;
    setRefusalPrompt: (prompt: string) => void;
    setStories: (stories: Record<string, StoryState>) => void;
    setCurrentStoryId: (id: string) => void;
    setCustomPresets: (presets: Record<string, any>) => void;
    setSelectedPreset: (preset: string | null) => void;
  },
  fetchModels: (key: string) => void
) {
  // Load settings on mount
  useEffect(() => {
    const initStore = async () => {
      try {
        let savedKey: string | null = null;
        let savedStoryModel: string | null = null;
        let savedTaskModels: any = null;
        let savedPrompts: any = null;
        let savedRefusalPrompt: string | null = null;
        let savedStories: Record<string, StoryState> | null = null;
        let savedCurrentStoryId: string | null = null;
        let savedCustomPresets: Record<string, any> | null = null;
        let savedSelectedPreset: string | null = null;

        if (IS_TAURI) {
          const store = await load("settings.json", { autoSave: true, defaults: {} });
          savedKey = (await store.get<string>("openrouterKey")) ?? null;
          savedStoryModel = (await store.get<string>("storyModel")) ?? null;
          savedTaskModels = (await store.get<any>("taskModels")) ?? null;
          savedPrompts = (await store.get<any>("prompts")) ?? null;
          savedRefusalPrompt = (await store.get<string>("refusalPrompt")) ?? null;
          savedStories = (await store.get<Record<string, StoryState>>("stories")) ?? null;
          savedCurrentStoryId = (await store.get<string>("currentStoryId")) ?? null;
          savedCustomPresets = (await store.get<Record<string, any>>("customPresets")) ?? null;
          savedSelectedPreset = (await store.get<string>("selectedPreset")) ?? null;
        } else {
          savedKey = localStorage.getItem("openrouterKey");
          savedStoryModel = localStorage.getItem("storyModel");
          const tm = localStorage.getItem("taskModels");
          if (tm) savedTaskModels = JSON.parse(tm);
          const p = localStorage.getItem("prompts");
          if (p) savedPrompts = JSON.parse(p);
          savedRefusalPrompt = localStorage.getItem("refusalPrompt");
          const s = localStorage.getItem("stories");
          if (s) savedStories = JSON.parse(s);
          savedCurrentStoryId = localStorage.getItem("currentStoryId");
          const cp = localStorage.getItem("customPresets");
          if (cp) savedCustomPresets = JSON.parse(cp);
          savedSelectedPreset = localStorage.getItem("selectedPreset");
        }

        if (savedKey) {
          setters.setOpenrouterKey(savedKey);
          fetchModels(savedKey);
        }
        if (savedStoryModel) setters.setStoryModel(savedStoryModel);

        if (savedCustomPresets) setters.setCustomPresets(savedCustomPresets);

        let presetToUse = "default";
        if (savedSelectedPreset) {
          setters.setSelectedPreset(savedSelectedPreset);
          presetToUse = savedSelectedPreset;
        }

        const customPresetModels = savedCustomPresets && savedCustomPresets[presetToUse];
        if (customPresetModels) {
          setters.setTaskModels({ ...customPresetModels });
        } else if (savedTaskModels) {
          setters.setTaskModels((prev) => ({ ...prev, ...savedTaskModels }));
        }

        if (savedPrompts) setters.setPrompts((prev) => ({ ...prev, ...savedPrompts }));
        if (savedRefusalPrompt) setters.setRefusalPrompt(savedRefusalPrompt);
        if (savedStories) setters.setStories(savedStories);
        if (savedCurrentStoryId) setters.setCurrentStoryId(savedCurrentStoryId);
      } catch (e) {
        console.error("Failed to load settings", e);
      }
    };
    initStore();
  }, []);

  // Save settings
  const saveSettings = useCallback(async () => {
    try {
      if (IS_TAURI) {
        const store = await load("settings.json", { autoSave: true, defaults: {} });
        await store.set("openrouterKey", settings.openrouterKey);
        await store.set("storyModel", settings.storyModel);
        await store.set("taskModels", settings.taskModels);
        await store.set("prompts", settings.prompts);
        await store.set("refusalPrompt", settings.refusalPrompt);
        await store.set("stories", settings.stories);
        await store.set("currentStoryId", settings.currentStoryId);
        await store.set("customPresets", settings.customPresets);
        await store.set("selectedPreset", settings.selectedPreset);
      } else {
        localStorage.setItem("openrouterKey", settings.openrouterKey);
        localStorage.setItem("storyModel", settings.storyModel);
        localStorage.setItem("taskModels", JSON.stringify(settings.taskModels));
        localStorage.setItem("customPresets", JSON.stringify(settings.customPresets));
        if (settings.selectedPreset) localStorage.setItem("selectedPreset", settings.selectedPreset);
        localStorage.setItem("prompts", JSON.stringify(settings.prompts));
        localStorage.setItem("refusalPrompt", settings.refusalPrompt);
        localStorage.setItem("stories", JSON.stringify(settings.stories));
        localStorage.setItem("currentStoryId", settings.currentStoryId);
      }
    } catch (e) {
      console.error("Failed to save settings", e);
    }
  }, [settings]);

  // Auto-save with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      saveSettings();
    }, 1000);
    return () => clearTimeout(timer);
  }, [saveSettings]);

  return { saveSettings };
}
