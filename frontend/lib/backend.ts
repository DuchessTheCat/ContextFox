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
      max_tokens: 20000
    }),
  });

  const json = await response.json();
  if (json.error) {
    throw new Error(json.error.message || JSON.stringify(json.error));
  }

  const responseContent = json.choices[0].message.content;
  const finishReason = json.choices[0].finish_reason;
  const refusal = json.choices[0].message?.refusal;

  // Check if response was truncated
  if (finishReason === "length") {
    console.warn("Response was truncated due to max_tokens limit");
  }

  // Check if content was refused
  if (finishReason === "content_filter" || refusal) {
    throw new Error("REFUSAL: " + (refusal || "Content filtered"));
  }

  return responseContent;
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
  refusalPrompt: string;
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
    refusalPrompt,
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

    // Retry logic for perspective and title
    const callWithRetry = async (name: string, model: string, prompt: string) => {
      let currentPrompt = prompt;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await callOpenRouter(openrouterKey, model, currentPrompt, storyContent);
          // Retry on empty response
          if (!res || res.trim().length === 0) {
            if (attempt === 0) {
              console.warn(`Empty response for ${name}, retrying...`);
              continue;
            }
          }
          return { status: "fulfilled" as const, value: res };
        } catch (e: any) {
          if (attempt === 0) {
            console.warn(`Retrying ${name} after error:`, e);
            // Check if this was a refusal
            if (e.message && e.message.includes("REFUSAL:")) {
              console.log(`Detected refusal for ${name}, appending refusal prompt on retry`);
              // Append refusal prompt before the hard rules (at end of soft rules)
              currentPrompt = prompt + "\n\n" + refusalPrompt;
            }
          } else {
            return { status: "rejected" as const, reason: e };
          }
        }
      }
      return { status: "rejected" as const, reason: new Error("Max retries exceeded") };
    };

    const [resPerspResult, resTitleResult] = await Promise.all([
      callWithRetry("perspective", perspectiveModel, pPerspFull),
      callWithRetry("title", titleModel, pTitleFull),
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
    let lastError: any = null;
    let currentPrompt = t.prompt;
    // Try twice on error
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await callOpenRouter(openrouterKey, t.model, currentPrompt, storyContent);

        // Check for empty response on critical tasks
        const isCriticalTask = t.type === 'summary';
        if (isCriticalTask && (!res || res.trim().length === 0)) {
          if (attempt === 0) {
            console.warn(`Empty response for critical task ${t.id}, retrying...`);
            continue; // Retry
          }
        }

        return { id: t.id, type: t.type, status: "fulfilled" as const, value: res, attempt };
      } catch (e: any) {
        lastError = e;
        if (attempt === 0) {
          console.warn(`Retrying ${t.id} after error:`, e);
          // Check if this was a refusal
          if (e.message && e.message.includes("REFUSAL:")) {
            console.log(`Detected refusal for ${t.id}, appending refusal prompt on retry`);
            // Append refusal prompt before the hard rules (at end of soft rules)
            currentPrompt = t.prompt + "\n\n" + refusalPrompt;
          }
        }
      }
    }
    return { id: t.id, type: t.type, status: "rejected" as const, reason: lastError };
  }));

  // Process card results
  const aiGeneratedCards: StoryCard[] = [];
  let newSummary = lastSummary;

  for (const res of allResults) {
    if (res.status === "fulfilled") {
      onTaskUpdate({ id: res.id, status: "completed", output: res.value });

      if (res.type === 'cards') {
        // Check if response is empty or whitespace - this is OK for cards (just means no new cards)
        if (!res.value || res.value.trim().length === 0) {
          console.warn(`Empty response for ${res.id}, skipping card generation (no new cards)`);
          onTaskUpdate({ id: res.id, status: "completed", output: "No new cards generated (empty response)" });
          continue;
        }

        try {
          const extractedJson = extractJson(res.value);

          if (!extractedJson || extractedJson.trim().length === 0) {
            console.warn(`No JSON found in response for ${res.id}, skipping card generation`);
            onTaskUpdate({ id: res.id, status: "completed", output: "No new cards generated (no JSON found)" });
            continue;
          }

          let json;
          try {
            json = JSON.parse(extractedJson);
          } catch (parseError) {
            // If JSON parsing fails, try to extract as much as possible from the truncated JSON
            console.warn(`JSON parse failed for ${res.id}, attempting recovery...`);

            // Try to find complete card objects even in truncated JSON
            const cardMatches = extractedJson.matchAll(/"title"\s*:\s*"([^"]+)"/g);
            let recoveredCards = 0;

            for (const match of cardMatches) {
              // Try to extract complete card data around each title
              const titleIndex = match.index!;
              const afterTitle = extractedJson.substring(titleIndex, Math.min(extractedJson.length, titleIndex + 1000));

              const keysMatch = afterTitle.match(/"keys"\s*:\s*"([^"]*)"/);
              const valueMatch = afterTitle.match(/"value"\s*:\s*"([^"]*)"/);
              const typeMatch = afterTitle.match(/"type"\s*:\s*"([^"]*)"/);

              if (keysMatch || valueMatch) {
                aiGeneratedCards.push({
                  keys: keysMatch ? keysMatch[1] : "",
                  value: valueMatch ? valueMatch[1] : "",
                  type: typeMatch ? typeMatch[1] : "",
                  title: match[1],
                  description: "",
                  useForCharacterCreation: false,
                });
                recoveredCards++;
              }
            }

            if (recoveredCards > 0) {
              console.log(`Recovered ${recoveredCards} cards from truncated JSON`);
              onTaskUpdate({ id: res.id, status: "completed", output: `Partial parse: recovered ${recoveredCards} cards from truncated response` });
              continue;
            } else {
              console.error(`Failed to parse or recover cards for ${res.id}:`, parseError);
              onTaskUpdate({ id: res.id, status: "error", output: `Parse error: ${parseError}` });
              continue;
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
          console.error(`Error processing cards for ${res.id}:`, e);
          onTaskUpdate({ id: res.id, status: "error", output: String(e) });
          continue;
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

        // Additional cleanup: if summary still starts with JSON structure, try to extract again
        if (typeof newSummary === 'string' && newSummary.trim().startsWith('{')) {
          try {
            const secondParse = JSON.parse(newSummary);
            if (secondParse.summary) {
              newSummary = secondParse.summary;
            }
          } catch (e) {
            // If it fails, keep the current value
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

    // Retry logic for plot essentials
    let plotRes: string = "";
    let currentPlotPrompt = preparedPlotPrompt;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        plotRes = await callOpenRouter(openrouterKey, plotEssentialsModel, currentPlotPrompt, storyContent);

        // Retry on empty response
        if (!plotRes || plotRes.trim().length === 0) {
          if (attempt === 0) {
            console.warn(`Empty response for plot essentials, retrying...`);
            continue;
          } else {
            onTaskUpdate({ id: `plotEssentials${partIndicator}`, status: "error", output: "Empty response after retry" });
            break;
          }
        }

        onTaskUpdate({ id: `plotEssentials${partIndicator}`, status: "completed", output: plotRes });
        break;
      } catch (e: any) {
        if (attempt === 0) {
          console.warn(`Retrying plot essentials after error:`, e);
          // Check if this was a refusal
          if (e.message && e.message.includes("REFUSAL:")) {
            console.log(`Detected refusal for plot essentials, appending refusal prompt on retry`);
            // Append refusal prompt before the hard rules (at end of soft rules)
            const plotHardRules = '\n\nReturn ONLY a JSON object in this format: { "plotEssentials": "..." }';
            currentPlotPrompt = preparePrompt(plotPrompt + "\n\n" + refusalPrompt, plotHardRules);
          }
        } else {
          onTaskUpdate({ id: `plotEssentials${partIndicator}`, status: "error", output: String(e) });
          throw e;
        }
      }
    }

    if (plotRes && plotRes.trim().length > 0) {
      try {
        const plotJson = JSON.parse(extractJson(plotRes));
        let plotValue = plotJson.plotEssentials || plotRes;

        // If plot essentials is an array, convert to string
        if (Array.isArray(plotValue)) {
          plotValue = plotValue.join('\n\n');
        } else if (typeof plotValue !== 'string') {
          plotValue = String(plotValue);
        }

        newPlotEssentials = plotValue;
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

    // Retry logic for core self
    let coreSelfRes: string = "";
    let currentCoreSelfPrompt = preparedCoreSelfPrompt;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        coreSelfRes = await callOpenRouter(openrouterKey, coreSelfModel, currentCoreSelfPrompt, storyContent);
        onTaskUpdate({ id: `coreSelf${partIndicator}`, status: "completed", output: coreSelfRes });
        break;
      } catch (e: any) {
        if (attempt === 0) {
          console.warn(`Retrying core self after error:`, e);
          // Check if this was a refusal
          if (e.message && e.message.includes("REFUSAL:")) {
            console.log(`Detected refusal for core self, appending refusal prompt on retry`);
            // Append refusal prompt before the hard rules (at end of soft rules)
            currentCoreSelfPrompt = coreSelfPromptPrepared + "\n\n" + refusalPrompt + CORE_SELF_HARD_RULES;
          }
        } else {
          onTaskUpdate({ id: `coreSelf${partIndicator}`, status: "error", output: String(e) });
          throw e;
        }
      }
    }

    try {
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
