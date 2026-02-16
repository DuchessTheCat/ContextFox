/**
 * Hook for fetching and managing models
 */

import { useState } from "react";
import { getOpenRouterModels } from "../lib/api/api-client";

export function useModelFetcher() {
  const [openrouterModels, setOpenrouterModels] = useState<string[]>([]);
  const [status, setStatus] = useState("");

  const fetchModels = async (key: string, setContextLengths: (lengths: Record<string, number>) => void) => {
    if (!key) return;
    setStatus("Fetching models...");
    try {
      const { models, contextLengths } = await getOpenRouterModels(key);
      setOpenrouterModels(models);
      setContextLengths(contextLengths);
      setStatus("Models updated");
    } catch (e) {
      setStatus(`Error fetching models: ${e}`);
    }
  };

  return {
    openrouterModels,
    setOpenrouterModels,
    status,
    setStatus,
    fetchModels,
  };
}
