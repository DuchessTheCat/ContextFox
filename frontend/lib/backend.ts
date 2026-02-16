import { StoryCard, Task } from "../types";

export async function getOpenRouterModels(apiKey: string): Promise<string[]> {
  const response = await fetch("https://openrouter.ai/api/v1/models", {
    headers: {
      "Authorization": `Bearer ${apiKey}`,
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.statusText}`);
  }
  const json = await response.json();
  const models = json.data
    .filter((model: any) => {
      const arch = model.architecture;
      if (arch) {
        if (arch.output_modalities) {
          const canOutputText = arch.output_modalities.includes("text");
          const canOutputImage = arch.output_modalities.includes("image");
          return canOutputText && !canOutputImage;
        } else if (arch.modality) {
          return arch.modality.includes("text") && !arch.modality.includes("image");
        }
      }
      return true;
    })
    .map((model: any) => model.id)
    .sort();
  return models;
}

export function extractJson(s: string): string {
  const startBrace = s.indexOf('{');
  const startBracket = s.indexOf('[');
  
  let start = -1;
  let endChar = '';
  
  if (startBrace !== -1 && (startBracket === -1 || startBrace < startBracket)) {
    start = startBrace;
    endChar = '}';
  } else if (startBracket !== -1) {
    start = startBracket;
    endChar = ']';
  }
  
  if (start !== -1) {
    const end = s.lastIndexOf(endChar);
    if (end !== -1) {
      return s.substring(start, end + 1);
    } else {
      return s.substring(start) + endChar;
    }
  }
  return s;
}

async function callOpenRouter(apiKey: string, model: string, prompt: string, content: string): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: content },
      ],
      response_format: { type: "json_object" },
      max_tokens: 4000
    }),
  });

  const json = await response.json();
  if (json.error) {
    throw new Error(json.error.message || JSON.stringify(json.error));
  }
  return json.choices[0].message.content;
}

const PERSPECTIVE_HARD_RULES = "\n\nReturn ONLY a JSON object in this format: { \"character\": \"name\" }";
const TITLE_HARD_RULES = "\n\nReturn ONLY a JSON object in this format: { \"title\": \"...\" }";
const CARDS_HARD_RULES = "\n\nReturn ONLY a JSON object with a \"cards\" key containing an array of story cards. For each card, use \"value\" for the description. Format: { \"cards\": [ { \"keys\": \"trigger1, trigger2\", \"value\": \"Detailed description of what this is\", \"type\": \"character/location/concept\", \"title\": \"Name\" } ] }";
const SUMMARY_HARD_RULES = "\n\nReturn ONLY a JSON object with a \"summary\" key containing the text of the summary: { \"summary\": \"...\" }";

export interface ProcessCardsParams {
  storyContent: string;
  lastLineText: string;
  lastSummary: string;
  lastCards: string;
  lastCharacter: string;
  lastStoryTitle: string;
  openrouterKey: string;
  storyModel: string;
  perspectiveModel: string;
  titleModel: string;
  charactersModel: string;
  locationsModel: string;
  conceptsModel: string;
  summaryModel: string;
  perspectivePrompt: string;
  titlePrompt: string;
  charactersPrompt: string;
  locationsPrompt: string;
  conceptsPrompt: string;
  summaryPrompt: string;
  onTaskUpdate: (update: Partial<Task>) => void;
}

export async function processCards(params: ProcessCardsParams) {
  const {
    storyContent: storyContentFull,
    lastLineText,
    lastSummary,
    lastCards,
    lastCharacter,
    lastStoryTitle,
    openrouterKey,
    storyModel,
    perspectiveModel,
    titleModel,
    charactersModel,
    locationsModel,
    conceptsModel,
    summaryModel,
    perspectivePrompt,
    titlePrompt,
    charactersPrompt,
    locationsPrompt,
    conceptsPrompt,
    summaryPrompt,
    onTaskUpdate,
  } = params;

  let storyContent = "";
  if (!lastLineText) {
    storyContent = storyContentFull;
  } else {
    const pos = storyContentFull.lastIndexOf(lastLineText);
    if (pos !== -1) {
      storyContent = storyContentFull.substring(pos + lastLineText.length).trim();
    } else {
      storyContent = storyContentFull;
    }
  }

  if (!storyContent) {
    throw new Error("No new content to process");
  }

  // 1 & 1.5 Parallel Perspective and Title
  const pPerspFull = `${perspectivePrompt}${PERSPECTIVE_HARD_RULES}`;
  const pTitleFull = `${titlePrompt}${TITLE_HARD_RULES}`;

  onTaskUpdate({
    id: "perspective",
    name: "Detecting Perspective",
    status: "processing",
    context: `System:\n${pPerspFull}\n\nContent:\n${storyContent}`,
    output: "",
  });

  onTaskUpdate({
    id: "title",
    name: "Detecting Story Title",
    status: "processing",
    context: `System:\n${pTitleFull}\n\nContent:\n${storyContent}`,
    output: "",
  });

  const [resPerspResult, resTitleResult] = await Promise.allSettled([
    callOpenRouter(openrouterKey, perspectiveModel, pPerspFull, storyContent),
    callOpenRouter(openrouterKey, titleModel, pTitleFull, storyContent),
  ]);

  let character = lastCharacter;
  if (resPerspResult.status === "fulfilled") {
    const res = resPerspResult.value;
    onTaskUpdate({ id: "perspective", status: "completed", output: res });
    try {
      const json = JSON.parse(extractJson(res));
      character = json.character || lastCharacter;
    } catch (e) {}
  } else {
    onTaskUpdate({ id: "perspective", status: "error", output: resPerspResult.reason.toString() });
  }

  let storyTitle = lastStoryTitle;
  if (resTitleResult.status === "fulfilled") {
    const res = resTitleResult.value;
    onTaskUpdate({ id: "title", status: "completed", output: res });
    try {
      const json = JSON.parse(extractJson(res));
      storyTitle = json.title || lastStoryTitle;
    } catch (e) {}
  } else {
    onTaskUpdate({ id: "title", status: "error", output: resTitleResult.reason.toString() });
  }

  let oldCards: StoryCard[] = [];
  try {
    oldCards = JSON.parse(lastCards);
  } catch (e) {}

  const strippedCards = oldCards.map(c => ({ title: c.title, value: c.value }));
  const cardsContext = JSON.stringify(strippedCards, null, 2);

  const preparePrompt = (prompt: string, hardRules: string) => {
    return prompt
      .replace(/\$model/g, storyModel)
      .replace(/\$character/g, character)
      .replace(/\$storyTitle/g, storyTitle)
      .replace(/\$lastSummary/g, lastSummary)
      .replace(/\$cards/g, cardsContext) + hardRules;
  };

  // 2. Parallel requests for cards
  const pChars = preparePrompt(charactersPrompt, CARDS_HARD_RULES);
  const pLocs = preparePrompt(locationsPrompt, CARDS_HARD_RULES);
  const pConcs = preparePrompt(conceptsPrompt, CARDS_HARD_RULES);

  const tasksInfo = [
    { id: "characters", name: "Generating Characters", prompt: pChars, model: charactersModel },
    { id: "locations", name: "Generating Locations", prompt: pLocs, model: locationsModel },
    { id: "concepts", name: "Generating Concepts/Factions", prompt: pConcs, model: conceptsModel },
  ];

  tasksInfo.forEach(t => {
    onTaskUpdate({
      id: t.id,
      name: t.name,
      status: "processing",
      context: `System:\n${t.prompt}\n\nContent:\n${storyContent}`,
      output: "",
    });
  });

  const cardResults = await Promise.all(tasksInfo.map(async (t) => {
    try {
      const res = await callOpenRouter(openrouterKey, t.model, t.prompt, storyContent);
      return { id: t.id, status: "fulfilled" as const, value: res };
    } catch (e: any) {
      return { id: t.id, status: "rejected" as const, reason: e };
    }
  }));

  const aiGeneratedCards: StoryCard[] = [];
  for (const res of cardResults) {
    if (res.status === "fulfilled") {
      onTaskUpdate({ id: res.id, status: "completed", output: res.value });
      try {
        const json = JSON.parse(extractJson(res.value));
        if (Array.isArray(json.cards)) {
          json.cards.forEach((cardVal: any) => {
            aiGeneratedCards.push({
              keys: cardVal.keys || "",
              value: cardVal.value || "",
              type: cardVal.type || "",
              title: cardVal.title || "",
              description: "",
              useForCharacterCreation: false,
            });
          });
        }
      } catch (e) {
        throw new Error(`Failed to parse card JSON: ${e}. Raw response: ${res.value}`);
      }
    } else {
      onTaskUpdate({ id: res.id, status: "error", output: String(res.reason) });
      throw res.reason;
    }
  }

  // Merger logic
  for (const aiCard of aiGeneratedCards) {
    const existing = oldCards.find(c => c.title === aiCard.title);
    if (existing) {
      existing.keys = aiCard.keys;
      existing.value = aiCard.value;
    } else {
      oldCards.push(aiCard);
    }
  }

  // 3. Summary request
  const pSum = preparePrompt(summaryPrompt, SUMMARY_HARD_RULES);
  onTaskUpdate({
    id: "summary",
    name: "Generating Summary",
    status: "processing",
    context: `System:\n${pSum}\n\nContent:\n${storyContent}`,
    output: "",
  });

  try {
    const summaryRes = await callOpenRouter(openrouterKey, summaryModel, pSum, storyContent);
    onTaskUpdate({ id: "summary", status: "completed", output: summaryRes });
    const summaryJson = JSON.parse(extractJson(summaryRes));
    const newSummary = summaryJson.summary || summaryRes;

    const lines = storyContent.trimEnd().split("\n");
    const lastLineNow = lines[lines.length - 1] || "";

    return {
      story_cards: JSON.stringify(oldCards, null, 2),
      summary: newSummary,
      last_line: lastLineNow,
      character,
      story_title: storyTitle,
    };
  } catch (e: any) {
    onTaskUpdate({ id: "summary", status: "error", output: String(e) });
    throw e;
  }
}
