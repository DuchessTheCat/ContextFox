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

export async function executeCardGenerationTasks(
  tasks: TaskDefinition[],
  storyContent: string,
  getLastSummary: () => string,
  openrouterKey: string,
  refusalPrompt: string,
  onTaskUpdate: (update: Partial<Task>) => void,
  callOpenRouter: (key: string, model: string, prompt: string, content: string) => Promise<string>,
  onTaskComplete?: (taskId: string, taskType: string, parsedResult: any) => void
): Promise<void> {
  // Build prompts for UI display NOW
  const taskPrompts = new Map<string, string>();
  tasks.forEach((t) => {
    const initialPrompt = typeof t.prompt === 'function' ? t.prompt() : t.prompt;
    taskPrompts.set(t.id, initialPrompt);

    onTaskUpdate({
      id: t.id,
      name: t.name,
      status: "processing",
      context: `System:\n${initialPrompt}\n\nContent:\n${storyContent}`,
      output: "",
      model: t.model,
      systemPrompt: initialPrompt,
      userContent: storyContent,
    });
  });

  // Helper to execute a single task
  const executeTask = async (t: TaskDefinition): Promise<TaskResult> => {
    let lastError: any = null;
    let cachedPrompt = taskPrompts.get(t.id)!;

    // Try twice on error
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        let currentPrompt: string;

        if (attempt === 0) {
          // First attempt: RE-BUILD PROMPT RIGHT BEFORE API CALL to get fresh values
          currentPrompt = typeof t.prompt === 'function' ? t.prompt() : t.prompt;
          console.log(`[TASK EXECUTING] ${t.id} - re-building prompt with fresh values (${currentPrompt.length} chars)`);

          // Cache this for retries
          cachedPrompt = currentPrompt;
          taskPrompts.set(t.id, currentPrompt);

          // Update task with fresh prompt
          onTaskUpdate({
            id: t.id,
            context: `System:\n${currentPrompt}\n\nContent:\n${storyContent}`,
            systemPrompt: currentPrompt,
          });
        } else {
          // Retry attempt: use cached prompt (possibly with refusal appended)
          currentPrompt = cachedPrompt;
          console.log(`[TASK RETRY] ${t.id} - using cached prompt (${currentPrompt.length} chars)`);

          onTaskUpdate({
            id: t.id,
            context: `System:\n${currentPrompt}\n\nContent:\n${storyContent}`,
            systemPrompt: currentPrompt,
          });
        }

        const res = await callOpenRouter(openrouterKey, t.model, currentPrompt, storyContent);

        // Check for empty response on critical tasks
        const isCriticalTask = t.type === "summary";
        if (isCriticalTask && (!res || res.trim().length === 0)) {
          if (attempt === 0) {
            console.warn(`Empty response for critical task ${t.id}, retrying...`);
            continue;
          }
        }

        // Update task status immediately when response received
        onTaskUpdate({ id: t.id, status: "completed", output: res });

        return { id: t.id, type: t.type, status: "fulfilled", value: res };
      } catch (e: any) {
        lastError = e;
        if (attempt === 0) {
          console.warn(`Retrying ${t.id} after error:`, e);
          // Check if this was a refusal - REBUILD prompt with refusal line (cache invalidated)
          if (e.message && e.message.includes("REFUSAL:")) {
            console.log(`Detected refusal for ${t.id}, rebuilding prompt with refusal line`);
            const freshPrompt = typeof t.prompt === 'function' ? t.prompt() : t.prompt;
            cachedPrompt = freshPrompt + "\n\n" + refusalPrompt;
            taskPrompts.set(t.id, cachedPrompt);
          }
          continue;
        }
      }
    }

    // Update task status immediately on error
    onTaskUpdate({
      id: t.id,
      status: "error",
      output: String(lastError),
    });

    return { id: t.id, type: t.type, status: "rejected", reason: lastError };
  };

  // Execute ALL tasks in parallel
  const allResults = await Promise.all(tasks.map(t => executeTask(t)));

  // Parse and notify ALL results via callback - NO return values used
  for (const res of allResults) {
    if (res.status === 'fulfilled' && res.value) {
      if (res.type === 'cards') {
        const cards = parseCardsResponse(res.value);
        if (cards.length > 0 && onTaskComplete) {
          onTaskComplete(res.id, res.type, cards);
        }
      } else if (res.type === 'summary') {
        const parsed = parseSummaryResponse(res.value, getLastSummary());
        if (onTaskComplete) {
          onTaskComplete(res.id, res.type, parsed);
        }
      }
    }
  }

  // Throw if any critical task failed
  const summaryResult = allResults.find(r => r.type === 'summary');
  if (summaryResult && summaryResult.status === 'rejected') {
    throw summaryResult.reason;
  }
}
