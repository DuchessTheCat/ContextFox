/**
 * Executes plot essentials generation task
 */

import { Task } from "../../types";
import { callWithRetry } from "../utils/retry-logic";
import { parsePlotEssentialsResponse } from "../parsing/json-parsing";

export async function executePlotEssentials(
  storyContent: string,
  lastPlotEssentials: string,
  plotEssentialsPrompt: string,
  plotEssentialsWithContextPrompt: string,
  plotEssentialsModel: string,
  openrouterKey: string,
  refusalPrompt: string,
  partIndicator: string,
  onTaskUpdate: (update: Partial<Task>) => void,
  callOpenRouter: (key: string, model: string, prompt: string, content: string) => Promise<string>
): Promise<string> {
  const hasExistingPlotEssentials =
    lastPlotEssentials && typeof lastPlotEssentials === "string" && lastPlotEssentials.trim().length > 0;
  const plotPrompt = hasExistingPlotEssentials ? plotEssentialsWithContextPrompt : plotEssentialsPrompt;

  onTaskUpdate({
    id: `plotEssentials${partIndicator}`,
    name: `Generating Plot Essentials${partIndicator}`,
    status: "processing",
    context: `System:\n${plotPrompt}\n\nContent:\n${storyContent}`,
    output: "",
    model: plotEssentialsModel,
    systemPrompt: plotPrompt,
    userContent: storyContent,
  });

  let plotPromptWithRefusal = plotPrompt;

  const result = await callWithRetry(
    "plot essentials",
    () => callOpenRouter(openrouterKey, plotEssentialsModel, plotPromptWithRefusal, storyContent),
    refusalPrompt,
    () => {
      plotPromptWithRefusal = plotPrompt + "\n\n" + refusalPrompt;
    }
  );

  if (result.status === "fulfilled") {
    const plotRes = result.value;
    onTaskUpdate({
      id: `plotEssentials${partIndicator}`,
      status: "completed",
      output: plotRes,
    });

    if (plotRes && plotRes.trim().length > 0) {
      return parsePlotEssentialsResponse(plotRes);
    }
    return lastPlotEssentials;
  } else {
    onTaskUpdate({
      id: `plotEssentials${partIndicator}`,
      status: "error",
      output: String(result.reason),
    });
    throw result.reason;
  }
}
