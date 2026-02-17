/**
 * Hook for managing model configurations with persistence
 */

import { useState, useEffect } from "react";
import { ModelConfig } from "../types/modelConfig";
import { IS_TAURI } from "../lib/utils";
import { load } from "@tauri-apps/plugin-store";

export function useModelConfig() {
  const [modelConfigs, setModelConfigs] = useState<Record<string, ModelConfig>>({});

  // Load from storage on mount
  useEffect(() => {
    async function loadConfigs() {
      try {
        if (IS_TAURI) {
          const store = await load("settings.json", { autoSave: true, defaults: {} });
          const saved = await store.get<Record<string, ModelConfig>>("modelConfigs");
          if (saved) {
            setModelConfigs(saved);
          }
        } else {
          const saved = localStorage.getItem("modelConfigs");
          if (saved) {
            setModelConfigs(JSON.parse(saved));
          }
        }
      } catch (e) {
        console.error("Failed to load model configs:", e);
      }
    }
    loadConfigs();
  }, []);

  // Save to storage whenever configs change
  useEffect(() => {
    async function saveConfigs() {
      try {
        if (IS_TAURI) {
          const store = await load("settings.json", { autoSave: true, defaults: {} });
          await store.set("modelConfigs", modelConfigs);
        } else {
          localStorage.setItem("modelConfigs", JSON.stringify(modelConfigs));
        }
      } catch (e) {
        console.error("Failed to save model configs:", e);
      }
    }

    // Don't save on initial empty state
    if (Object.keys(modelConfigs).length > 0) {
      saveConfigs();
    }
  }, [modelConfigs]);

  const saveModelConfig = (modelId: string, config: ModelConfig) => {
    setModelConfigs((prev) => ({ ...prev, [modelId]: config }));
  };

  return {
    modelConfigs,
    saveModelConfig,
  };
}
