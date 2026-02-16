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
const CORE_SELF_HARD_RULES = "\n\nReturn ONLY a JSON object in this format: { \"coreSelfUpdates\": [ { \"title\": \"exact card title\", \"core_self\": \"2-5 sentence description\" } ] }";

export interface ProcessCardsParams {
  storyContent: string;
  lastLineText: string;
  currentPart: number;
  isZipFile: boolean;
  zipParts?: Map<number, string>;
  lastSummary: string;
  lastCards: string;
  lastPlotEssentials: string;
  lastCharacter: string;
  lastStoryTitle: string;
  excludedCardTitles: string[];
  includedCardTitles: string[];
  openrouterKey: string;
  storyModel: string;
  perspectiveModel: string;
  titleModel: string;
  charactersModel: string;
  locationsModel: string;
  conceptsModel: string;
  summaryModel: string;
  plotEssentialsModel: string;
  coreSelfModel: string;
  perspectivePrompt: string;
  titlePrompt: string;
  charactersPrompt: string;
  locationsPrompt: string;
  conceptsPrompt: string;
  summaryPrompt: string;
  plotEssentialsPrompt: string;
  plotEssentialsWithContextPrompt: string;
  coreSelfPrompt: string;
  onTaskUpdate: (update: Partial<Task>) => void;
}

export async function processCards(params: ProcessCardsParams) {
  const {
    storyContent: storyContentFull,
    lastLineText,
    currentPart,
    isZipFile,
    zipParts,
    lastSummary,
    lastCards,
    lastPlotEssentials,
    lastCharacter,
    lastStoryTitle,
    excludedCardTitles,
    includedCardTitles,
    openrouterKey,
    storyModel,
    perspectiveModel,
    titleModel,
    charactersModel,
    locationsModel,
    conceptsModel,
    summaryModel,
    plotEssentialsModel,
    coreSelfModel,
    perspectivePrompt,
    titlePrompt,
    charactersPrompt,
    locationsPrompt,
    conceptsPrompt,
    summaryPrompt,
    plotEssentialsPrompt,
    plotEssentialsWithContextPrompt,
    coreSelfPrompt,
    onTaskUpdate,
  } = params;

  let storyContent = "";
  let newPart = currentPart;
  let newLastLine = "";

  const totalParts = isZipFile && zipParts ? zipParts.size : 1;
  const partIndicator = isZipFile && zipParts ? ` (${currentPart}/${totalParts})` : "";

  if (isZipFile && zipParts) {
    // Multi-part processing - process ONE part at a time
    const currentPartContent = zipParts.get(currentPart);
    if (!currentPartContent) {
      throw new Error(`Part ${currentPart} not found in zip file`);
    }

    // Find content after lastLineText in current part
    if (lastLineText) {
      const pos = currentPartContent.lastIndexOf(lastLineText);
      if (pos !== -1) {
        storyContent = currentPartContent.substring(pos + lastLineText.length).trim();
      } else {
        storyContent = currentPartContent;
      }
    } else {
      storyContent = currentPartContent;
    }

    if (!storyContent) {
      // Current part is exhausted, move to next part
      if (currentPart < zipParts.size) {
        newPart = currentPart + 1;
        const nextPartContent = zipParts.get(newPart);
        if (nextPartContent) {
          storyContent = nextPartContent;
          newLastLine = ""; // Reset last line for new part
        } else {
          throw new Error("No new content to process");
        }
      } else {
        throw new Error("No new content to process");
      }
    }

    // Determine new last line for current part
    const allLines = storyContent.trimEnd().split("\n");
    newLastLine = allLines[allLines.length - 1] || "";
    newPart = currentPart;
  } else {
    // Single file processing (original logic)
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

    const lines = storyContent.trimEnd().split("\n");
    newLastLine = lines[lines.length - 1] || "";
    newPart = 1; // Single files are always part 1
  }

  // 1 & 1.5 Parallel Perspective and Title (only run once on part 1)
  let character = lastCharacter;
  let storyTitle = lastStoryTitle;

  if (currentPart === 1 && (!lastCharacter || !lastStoryTitle)) {
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
  }

  let oldCards: StoryCard[] = [];
  try {
    oldCards = JSON.parse(lastCards);
  } catch (e) {}

  // Separate excluded cards from regular cards
  const isBrainCard = (c: StoryCard) =>
    c.title.toLowerCase().includes("brain") || (c.type && c.type.toLowerCase() === "brain");

  const isDefaultExcluded = (c: StoryCard) =>
    c.title.includes("Configure") || isBrainCard(c);

  const isExcluded = (c: StoryCard) => {
    // If explicitly included, override default exclusion
    if (includedCardTitles.includes(c.title)) {
      return false;
    }
    // Check if default excluded or user excluded
    return isDefaultExcluded(c) || excludedCardTitles.includes(c.title);
  };

  const excludedCards = oldCards.filter(c => isExcluded(c));
  const regularCards = oldCards.filter(c => !isExcluded(c));

  const strippedCards = regularCards.map(c => ({ title: c.title, value: c.value }));
  const cardsContext = JSON.stringify(strippedCards, null, 2);

  const preparePrompt = (prompt: string, hardRules: string) => {
    return prompt
      .replace(/\$model/g, storyModel)
      .replace(/\$character/g, character)
      .replace(/\$storyTitle/g, storyTitle)
      .replace(/\$lastSummary/g, lastSummary)
      .replace(/\$lastPlotEssentials/g, lastPlotEssentials)
      .replace(/\$cards/g, cardsContext) + hardRules;
  };

  // 2. Parallel requests for cards AND summary
  const pChars = preparePrompt(charactersPrompt, CARDS_HARD_RULES);
  const pLocs = preparePrompt(locationsPrompt, CARDS_HARD_RULES);
  const pConcs = preparePrompt(conceptsPrompt, CARDS_HARD_RULES);
  const pSum = preparePrompt(summaryPrompt, SUMMARY_HARD_RULES);

  const tasksInfo = [
    { id: `characters${partIndicator}`, name: `Generating Characters${partIndicator}`, prompt: pChars, model: charactersModel, type: 'cards' as const },
    { id: `locations${partIndicator}`, name: `Generating Locations${partIndicator}`, prompt: pLocs, model: locationsModel, type: 'cards' as const },
    { id: `concepts${partIndicator}`, name: `Generating Concepts/Factions${partIndicator}`, prompt: pConcs, model: conceptsModel, type: 'cards' as const },
    { id: `summary${partIndicator}`, name: `Generating Summary${partIndicator}`, prompt: pSum, model: summaryModel, type: 'summary' as const },
  ].filter(t => t.model !== "None");

  tasksInfo.forEach(t => {
    onTaskUpdate({
      id: t.id,
      name: t.name,
      status: "processing",
      context: `System:\n${t.prompt}\n\nContent:\n${storyContent}`,
      output: "",
    });
  });

  const allResults = await Promise.all(tasksInfo.map(async (t) => {
    try {
      const res = await callOpenRouter(openrouterKey, t.model, t.prompt, storyContent);
      return { id: t.id, type: t.type, status: "fulfilled" as const, value: res };
    } catch (e: any) {
      return { id: t.id, type: t.type, status: "rejected" as const, reason: e };
    }
  }));

  // Process card results
  const aiGeneratedCards: StoryCard[] = [];
  let newSummary = lastSummary;

  for (const res of allResults) {
    if (res.status === "fulfilled") {
      onTaskUpdate({ id: res.id, status: "completed", output: res.value });

      if (res.type === 'cards') {
        try {
          const extractedJson = extractJson(res.value);
          let json;
          try {
            json = JSON.parse(extractedJson);
          } catch (parseError) {
            // If JSON parsing fails, try to manually fix common issues like unterminated strings
            // Replace unescaped newlines within string values
            const fixedJson = extractedJson
              .replace(/\\n/g, '\\\\n')  // Escape already-escaped newlines
              .replace(/([^\\])\\"/g, '$1\\\\"');  // Escape quotes that aren't already escaped
            try {
              json = JSON.parse(fixedJson);
            } catch (secondError) {
              throw new Error(`Failed to parse card JSON even after attempting fixes: ${secondError}. Raw response: ${res.value}`);
            }
          }

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
      } else if (res.type === 'summary') {
        try {
          const summaryJson = JSON.parse(extractJson(res.value));
          newSummary = summaryJson.summary || res.value;
        } catch (parseError) {
          // If JSON parsing fails, try to extract summary field manually
          const summaryMatch = res.value.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
          if (summaryMatch) {
            // Unescape the extracted string
            newSummary = summaryMatch[1]
              .replace(/\\n/g, '\n')
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, '\\');
          } else {
            // Fallback: use the raw response
            newSummary = res.value;
          }
        }
      }
    } else {
      onTaskUpdate({ id: res.id, status: "error", output: String(res.reason) });
      throw res.reason;
    }
  }

  // Merger logic - only merge with regular cards, not excluded cards
  for (const aiCard of aiGeneratedCards) {
    const existing = regularCards.find(c => c.title === aiCard.title);
    if (existing) {
      existing.keys = aiCard.keys;
      existing.value = aiCard.value;
    } else {
      regularCards.push(aiCard);
    }
  }

  // Re-combine regular cards with excluded cards
  const finalCards = [...regularCards, ...excludedCards];

  // 4. Plot Essentials request (sequential, after summary)
  let newPlotEssentials = lastPlotEssentials;
  if (plotEssentialsModel !== "None") {
    // Use different prompt based on whether we have existing plot essentials
    const hasExistingPlotEssentials = lastPlotEssentials && typeof lastPlotEssentials === 'string' && lastPlotEssentials.trim().length > 0;
    const plotPrompt = hasExistingPlotEssentials ? plotEssentialsWithContextPrompt : plotEssentialsPrompt;
    const plotHardRules = '\n\nReturn ONLY a JSON object in this format: { "plotEssentials": "..." }';
    const preparedPlotPrompt = preparePrompt(plotPrompt, plotHardRules);

    onTaskUpdate({
      id: `plotEssentials${partIndicator}`,
      name: `Generating Plot Essentials${partIndicator}`,
      status: "processing",
      context: `System:\n${preparedPlotPrompt}\n\nContent:\n${storyContent}`,
      output: "",
    });

    try {
      const plotRes = await callOpenRouter(openrouterKey, plotEssentialsModel, preparedPlotPrompt, storyContent);
      onTaskUpdate({ id: `plotEssentials${partIndicator}`, status: "completed", output: plotRes });

      try {
        const plotJson = JSON.parse(extractJson(plotRes));
        newPlotEssentials = plotJson.plotEssentials || plotRes;
      } catch (parseError) {
        // If JSON parsing fails, try to extract plotEssentials field manually
        const plotMatch = plotRes.match(/"plotEssentials"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
        if (plotMatch) {
          // Unescape the extracted string
          newPlotEssentials = plotMatch[1]
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
        } else {
          // Fallback: use the raw response
          newPlotEssentials = plotRes;
        }
      }
    } catch (e: any) {
      onTaskUpdate({ id: `plotEssentials${partIndicator}`, status: "error", output: String(e) });
      throw e;
    }
  }

  // 5. Core Self Populator/Enhancer (runs at the very end)
  let updatedFinalCards = finalCards;
  if (coreSelfModel !== "None") {
    // Get only Brain type cards for the context (with full description)
    const brainCards = finalCards.filter(c => isBrainCard(c));
    const brainCardsWithDesc = brainCards.map(c => ({
      title: c.title,
      value: c.value,
      description: c.description,
      keys: c.keys,
      type: c.type
    }));

    // Prepare context with full cards including description field
    const fullCardsContext = JSON.stringify(brainCardsWithDesc, null, 2);
    const coreSelfPromptPrepared = coreSelfPrompt
      .replace(/\$lastSummary/g, newSummary)
      .replace(/\$cards/g, fullCardsContext);

    const preparedCoreSelfPrompt = coreSelfPromptPrepared + CORE_SELF_HARD_RULES;

    onTaskUpdate({
      id: `coreSelf${partIndicator}`,
      name: `Core Self Populator/Enhancer${partIndicator}`,
      status: "processing",
      context: `System:\n${preparedCoreSelfPrompt}\n\nContent:\n${storyContent}`,
      output: "",
    });

    try {
      const coreSelfRes = await callOpenRouter(openrouterKey, coreSelfModel, preparedCoreSelfPrompt, storyContent);
      onTaskUpdate({ id: `coreSelf${partIndicator}`, status: "completed", output: coreSelfRes });
      const coreSelfJson = JSON.parse(extractJson(coreSelfRes));

      if (Array.isArray(coreSelfJson.coreSelfUpdates)) {
        // Merge core_self updates into brain cards
        updatedFinalCards = finalCards.map(card => {
          const update = coreSelfJson.coreSelfUpdates.find((u: any) => u.title === card.title);
          if (update && isBrainCard(card)) {
            let existingDesc = card.description || "";

            // Try parsing as JSON first (in case description is JSON)
            try {
              const descJson = JSON.parse(existingDesc);
              if (typeof descJson === "object" && descJson !== null) {
                // Description is JSON, just update or add core_self field
                descJson.core_self = update.core_self;
                return { ...card, description: JSON.stringify(descJson) };
              }
            } catch (e) {
              // Not JSON, treat as plain text
            }

            // Plain text description - remove existing core_self if present
            if (existingDesc.startsWith("core_self:")) {
              // Find end of core_self (blank line or end of string)
              const blankLineMatch = existingDesc.match(/\n\s*\n/);
              if (blankLineMatch && blankLineMatch.index !== undefined) {
                existingDesc = existingDesc.substring(blankLineMatch.index + blankLineMatch[0].length);
              } else {
                // No blank line found, core_self is the entire content
                existingDesc = "";
              }
            }

            // Add new core_self at the top
            const newDescription = existingDesc
              ? `core_self: ${update.core_self}\n\n${existingDesc}`
              : `core_self: ${update.core_self}`;
            return { ...card, description: newDescription };
          }
          return card;
        });
      }
    } catch (e: any) {
      onTaskUpdate({ id: `coreSelf${partIndicator}`, status: "error", output: String(e) });
      throw e;
    }
  }

  return {
    story_cards: JSON.stringify(updatedFinalCards, null, 2),
    summary: newSummary,
    plot_essentials: newPlotEssentials,
    last_line: newLastLine,
    current_part: newPart,
    character,
    story_title: storyTitle,
  };
}
