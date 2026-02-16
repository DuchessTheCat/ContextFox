/**
 * Executes card generation tasks (characters, locations, concepts) in parallel
 */

import { StoryCard, Task } from "../../types";
import { TaskDefinition } from "../utils/task-definitions";
import { parseCardsResponse, parseSummaryResponse } from "../parsing/json-parsing";

interface TaskResult {
  id: string;
  type: "cards" | "summary";
  status: "fulfilled" | "rejected";
  value?: string;
  reason?: Error;
}

export interface CardGenerationResult {
  cards: StoryCard[];
  summary: string;
}

export async function executeCardGenerationTasks(
  tasks: TaskDefinition[],
  storyContent: string,
  lastSummary: string,
  openrouterKey: string,
  refusalPrompt: string,
  onTaskUpdate: (update: Partial<Task>) => void,
  callOpenRouter: (key: string, model: string, prompt: string, content: string) => Promise<string>
): Promise<CardGenerationResult> {
  // Initialize all tasks
  tasks.forEach((t) => {
    onTaskUpdate({
      id: t.id,
      name: t.name,
      status: "processing",
      context: `System:\n${t.prompt}\n\nContent:\n${storyContent}`,
      output: "",
    });
  });

  const allResults = await Promise.all(
    tasks.map(async (t): Promise<TaskResult> => {
      let lastError: any = null;
      let currentPrompt = t.prompt;

      // Try twice on error
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await callOpenRouter(openrouterKey, t.model, currentPrompt, storyContent);

          // Check for empty response on critical tasks
          const isCriticalTask = t.type === "summary";
          if (isCriticalTask && (!res || res.trim().length === 0)) {
            if (attempt === 0) {
              console.warn(`Empty response for critical task ${t.id}, retrying...`);
              continue;
            }
          }

          return { id: t.id, type: t.type, status: "fulfilled", value: res };
        } catch (e: any) {
          lastError = e;
          if (attempt === 0) {
            console.warn(`Retrying ${t.id} after error:`, e);
            // Check if this was a refusal
            if (e.message && e.message.includes("REFUSAL:")) {
              console.log(`Detected refusal for ${t.id}, appending refusal prompt on retry`);
              currentPrompt = t.prompt + "\n\n" + refusalPrompt;
            }
            continue;
          }
        }
      }
      return { id: t.id, type: t.type, status: "rejected", reason: lastError };
    })
  );

  const aiGeneratedCards: StoryCard[] = [];
  let newSummary = lastSummary;

  for (const res of allResults) {
    if (res.status === "fulfilled" && res.value) {
      onTaskUpdate({ id: res.id, status: "completed", output: res.value });

      if (res.type === "cards") {
        const cards = parseCardsResponse(res.value);
        if (cards.length === 0) {
          console.warn(`Empty or invalid response for ${res.id}, no new cards generated`);
          onTaskUpdate({
            id: res.id,
            status: "completed",
            output: "No new cards generated",
          });
        } else {
          aiGeneratedCards.push(...cards);
        }
      } else if (res.type === "summary") {
        newSummary = parseSummaryResponse(res.value, lastSummary);
      }
    } else {
      onTaskUpdate({
        id: res.id,
        status: "error",
        output: String(res.reason),
      });

      // Only throw for critical tasks (summary)
      if (res.type === "summary") {
        throw res.reason;
      }
      // For card tasks, just log and continue
      console.warn(`Non-critical task ${res.id} failed, continuing without it:`, res.reason);
    }
  }

  return { cards: aiGeneratedCards, summary: newSummary };
}
