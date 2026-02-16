/**
 * Executes core self generation task for brain cards
 */

import { StoryCard, Task } from "../../types";
import { callWithRetry } from "../utils/retry-logic";
import { parseCoreSelfResponse } from "../parsing/json-parsing";
import { applyCoreSelfUpdates } from "../utils/core-self-updater";

export async function executeCoreSelf(
  storyContent: string,
  cards: StoryCard[],
  newSummary: string,
  coreSelfPrompt: string,
  coreSelfModel: string,
  openrouterKey: string,
  refusalPrompt: string,
  partIndicator: string,
  isBrainCard: (card: StoryCard) => boolean,
  onTaskUpdate: (update: Partial<Task>) => void,
  callOpenRouter: (key: string, model: string, prompt: string, content: string) => Promise<string>
): Promise<StoryCard[]> {
  const brainCards = cards.filter(isBrainCard);

  if (brainCards.length === 0) {
    console.log("No Brain cards found, skipping Core Self task");
    return cards;
  }

  const brainCardsWithDesc = brainCards.map((c) => ({
    title: c.title,
    value: c.value,
    description: c.description,
    keys: c.keys,
    type: c.type,
  }));

  const fullCardsContext = JSON.stringify(brainCardsWithDesc, null, 2);
  const coreSelfPromptPrepared = coreSelfPrompt
    .replace(/\$lastSummary/g, newSummary)
    .replace(/\$cards/g, fullCardsContext);

  const hardRules = '\n\nReturn ONLY a JSON object in this format: { "coreSelfUpdates": [ { "title": "exact card title", "core_self": "2-5 sentence description" } ] }';
  const preparedCoreSelfPrompt = coreSelfPromptPrepared + hardRules;

  onTaskUpdate({
    id: `coreSelf${partIndicator}`,
    name: `Core Self Populator/Enhancer${partIndicator}`,
    status: "processing",
    context: `System:\n${preparedCoreSelfPrompt}\n\nContent:\n${storyContent}`,
    output: "",
  });

  let coreSelfPromptWithRefusal = preparedCoreSelfPrompt;

  const result = await callWithRetry(
    "core self",
    () => callOpenRouter(openrouterKey, coreSelfModel, coreSelfPromptWithRefusal, ""),
    refusalPrompt,
    () => {
      coreSelfPromptWithRefusal = coreSelfPromptPrepared + "\n\n" + refusalPrompt + hardRules;
    }
  );

  if (result.status === "fulfilled") {
    const coreSelfRes = result.value;
    onTaskUpdate({
      id: `coreSelf${partIndicator}`,
      status: "completed",
      output: coreSelfRes,
    });

    if (coreSelfRes && coreSelfRes.trim().length > 0) {
      const updates = parseCoreSelfResponse(coreSelfRes);
      if (updates.length > 0) {
        return applyCoreSelfUpdates(cards, updates, isBrainCard);
      }
    }
    return cards;
  } else {
    onTaskUpdate({
      id: `coreSelf${partIndicator}`,
      status: "error",
      output: String(result.reason),
    });
    // Don't throw - just log error and continue
    console.error(`Core self failed after retry:`, result.reason);
    return cards;
  }
}
