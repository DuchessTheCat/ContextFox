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
  });

  onTaskUpdate({
    id: "title",
    name: "Detecting Story Title",
    status: "processing",
    context: `System:\n${titlePrompt}\n\nContent:\n${storyContent}`,
    output: "",
  });

  let character = lastCharacter;
  let storyTitle = lastStoryTitle;

  let perspectivePromptWithRefusal = perspectivePrompt;
  let titlePromptWithRefusal = titlePrompt;

  const [resPerspResult, resTitleResult] = await Promise.all([
    callWithRetry(
      "perspective",
      () => callOpenRouter(openrouterKey, perspectiveModel, perspectivePromptWithRefusal, storyContent),
      refusalPrompt,
      () => {
        perspectivePromptWithRefusal = perspectivePrompt + "\n\n" + refusalPrompt;
      }
    ),
    callWithRetry(
      "title",
      () => callOpenRouter(openrouterKey, titleModel, titlePromptWithRefusal, storyContent),
      refusalPrompt,
      () => {
        titlePromptWithRefusal = titlePrompt + "\n\n" + refusalPrompt;
      }
    ),
  ]);

  if (resPerspResult.status === "fulfilled") {
    const res = resPerspResult.value;
    onTaskUpdate({ id: "perspective", status: "completed", output: res });
    try {
      const json = JSON.parse(extractJson(res));
      character = json.character || lastCharacter;
    } catch (e) {
      // Keep existing character
    }
  } else {
    onTaskUpdate({
      id: "perspective",
      status: "error",
      output: resPerspResult.reason.toString(),
    });
  }

  if (resTitleResult.status === "fulfilled") {
    const res = resTitleResult.value;
    onTaskUpdate({ id: "title", status: "completed", output: res });
    try {
      const json = JSON.parse(extractJson(res));
      storyTitle = json.title || lastStoryTitle;
    } catch (e) {
      // Keep existing title
    }
  } else {
    onTaskUpdate({
      id: "title",
      status: "error",
      output: resTitleResult.reason.toString(),
    });
  }

  return { character, storyTitle };
}
