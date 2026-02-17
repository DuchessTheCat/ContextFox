/**
 * Defines task structures for parallel processing
 */

export interface TaskDefinition {
  id: string;
  name: string;
  prompt: string | (() => string);
  model: string;
  type: "cards" | "summary";
}

export function createTaskDefinitions(
  prompts: {
    characters: string | (() => string);
    locations: string | (() => string);
    concepts: string | (() => string);
    summary: string | (() => string);
  },
  models: {
    characters: string;
    locations: string;
    concepts: string;
    summary: string;
  },
  partIndicator: string
): TaskDefinition[] {
  return [
    {
      id: `characters${partIndicator}`,
      name: `Generating Characters${partIndicator}`,
      prompt: prompts.characters,
      model: models.characters,
      type: "cards" as const,
    },
    {
      id: `locations${partIndicator}`,
      name: `Generating Locations${partIndicator}`,
      prompt: prompts.locations,
      model: models.locations,
      type: "cards" as const,
    },
    {
      id: `concepts${partIndicator}`,
      name: `Generating Concepts/Factions${partIndicator}`,
      prompt: prompts.concepts,
      model: models.concepts,
      type: "cards" as const,
    },
    {
      id: `summary${partIndicator}`,
      name: `Generating Summary${partIndicator}`,
      prompt: prompts.summary,
      model: models.summary,
      type: "summary" as const,
    },
  ].filter((t) => t.model !== "None");
}
