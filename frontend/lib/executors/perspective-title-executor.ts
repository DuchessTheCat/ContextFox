/**
 * Executes perspective and title detection tasks in parallel
 */

import { Task } from "../../types";
import { callWithRetry } from "../utils/retry-logic";
import { extractJson } from "../parsing/json-parsing";

export interface PerspectiveTitleResult {
  character: string;
  storyTitle: string;
}

export async function executePerspectiveAndTitle(
  storyContent: string,
  lastCharacter: string,
  lastStoryTitle: string,
  perspectivePrompt: string,
  titlePrompt: string,
  perspectiveModel: string,
  titleModel: string,
  openrouterKey: string,
  refusalPrompt: string,
  onTaskUpdate: (update: Partial<Task>) => void,
  callOpenRouter: (key: string, model: string, prompt: string, content: string) => Promise<string>
): Promise<PerspectiveTitleResult> {
  onTaskUpdate({
    id: "perspective",
    name: "Detecting Perspective",
    status: "processing",
    context: `System:\n${perspectivePrompt}\n\nContent:\n${storyContent}`,
    output: "",
    model: perspectiveModel,
    systemPrompt: perspectivePrompt,
    userContent: storyContent,
  });

  onTaskUpdate({
    id: "title",
    name: "Detecting Story Title",
    status: "processing",
    context: `System:\n${titlePrompt}\n\nContent:\n${storyContent}`,
    output: "",
    model: titleModel,
    systemPrompt: titlePrompt,
    userContent: storyContent,
  });

  let character = lastCharacter;
  let storyTitle = lastStoryTitle;

  let perspectivePromptWithRefusal = perspectivePrompt;
  let titlePromptWithRefusal = titlePrompt;

  // Wrap story content to make it clear it's for reference, not to continue
  const wrappedContent = `[Story content for context - do not continue this story, follow the instructions in the system prompt instead]\n\n${storyContent}`;

  const tasks = [];

  // Only run perspective task if model is set
  if (perspectiveModel && perspectiveModel.toLowerCase() !== 'none') {
    tasks.push(
      callWithRetry(
        "perspective",
        () => callOpenRouter(openrouterKey, perspectiveModel, perspectivePromptWithRefusal, wrappedContent),
        refusalPrompt,
        () => {
          perspectivePromptWithRefusal = perspectivePrompt + "\n\n" + refusalPrompt;
        }
      )
    );
  } else {
    tasks.push(Promise.resolve({ status: 'skipped' as const }));
    onTaskUpdate({ id: "perspective", status: "completed", output: "Skipped (no model)" });
  }

  // Only run title task if model is set
  if (titleModel && titleModel.toLowerCase() !== 'none') {
    tasks.push(
      callWithRetry(
        "title",
        () => callOpenRouter(openrouterKey, titleModel, titlePromptWithRefusal, wrappedContent),
        refusalPrompt,
        () => {
          titlePromptWithRefusal = titlePrompt + "\n\n" + refusalPrompt;
        }
      )
    );
  } else {
    tasks.push(Promise.resolve({ status: 'skipped' as const }));
    onTaskUpdate({ id: "title", status: "completed", output: "Skipped (no model)" });
  }

  const [resPerspResult, resTitleResult] = await Promise.all(tasks);

  if (resPerspResult.status === "fulfilled") {
    const res = resPerspResult.value;
    onTaskUpdate({ id: "perspective", status: "completed", output: res });
    try {
      const json = JSON.parse(extractJson(res));
      character = json.character || lastCharacter;
    } catch (e) {
      // Keep existing character
    }
  } else if (resPerspResult.status === "rejected") {
    onTaskUpdate({
      id: "perspective",
      status: "error",
      output: resPerspResult.reason?.toString() || "Unknown error",
    });
  }
  // If status is 'skipped', task was already marked completed

  if (resTitleResult.status === "fulfilled") {
    const res = resTitleResult.value;
    onTaskUpdate({ id: "title", status: "completed", output: res });
    try {
      const json = JSON.parse(extractJson(res));
      storyTitle = json.title || lastStoryTitle;
    } catch (e) {
      // Keep existing title
    }
  } else if (resTitleResult.status === "rejected") {
    onTaskUpdate({
      id: "title",
      status: "error",
      output: resTitleResult.reason?.toString() || "Unknown error",
    });
  }
  // If status is 'skipped', task was already marked completed

  return { character, storyTitle };
}
