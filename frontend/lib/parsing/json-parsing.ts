/**
 * Handles JSON extraction and parsing with recovery strategies
 */

import { StoryCard } from "../../types";

export function extractJson(text: string): string {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  return jsonMatch ? jsonMatch[0] : text;
}

export function parseCardsResponse(response: string): StoryCard[] {
  if (!response || response.trim().length === 0) {
    return [];
  }

  const extractedJson = extractJson(response);

  if (!extractedJson || extractedJson.trim().length === 0) {
    return [];
  }

  try {
    const json = JSON.parse(extractedJson);
    if (Array.isArray(json.cards)) {
      return json.cards.map((cardVal: any) => ({
        keys: cardVal.keys || "",
        value: cardVal.value || "",
        type: cardVal.type || "",
        title: cardVal.title || "",
        description: "",
        useForCharacterCreation: false,
      }));
    }
    return [];
  } catch (parseError) {
    // Try to recover cards from truncated JSON
    return recoverCardsFromTruncatedJson(extractedJson);
  }
}

function recoverCardsFromTruncatedJson(truncatedJson: string): StoryCard[] {
  const recoveredCards: StoryCard[] = [];
  const cardMatches = truncatedJson.matchAll(/"title"\s*:\s*"([^"]+)"/g);

  for (const match of cardMatches) {
    const titleIndex = match.index!;
    const afterTitle = truncatedJson.substring(
      titleIndex,
      Math.min(truncatedJson.length, titleIndex + 1000)
    );

    const keysMatch = afterTitle.match(/"keys"\s*:\s*"([^"]*)"/);
    const valueMatch = afterTitle.match(/"value"\s*:\s*"([^"]*)"/);
    const typeMatch = afterTitle.match(/"type"\s*:\s*"([^"]*)"/);

    if (keysMatch || valueMatch) {
      recoveredCards.push({
        keys: keysMatch ? keysMatch[1] : "",
        value: valueMatch ? valueMatch[1] : "",
        type: typeMatch ? typeMatch[1] : "",
        title: match[1],
        description: "",
        useForCharacterCreation: false,
      });
    }
  }

  return recoveredCards;
}

export function parseSummaryResponse(response: string, _fallback: string): string {
  try {
    const json = JSON.parse(extractJson(response));
    return json.summary || response;
  } catch (parseError) {
    // Try to extract summary field manually
    const summaryMatch = response.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
    if (summaryMatch) {
      return summaryMatch[1]
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    }

    // Fallback: use the raw response
    let result = response;

    // Additional cleanup: if summary still starts with JSON structure, try to extract again
    if (typeof result === "string" && result.trim().startsWith("{")) {
      try {
        const secondParse = JSON.parse(result);
        if (secondParse.summary) {
          return secondParse.summary;
        }
      } catch (e) {
        // Keep current value
      }
    }

    return result;
  }
}

export function parsePlotEssentialsResponse(response: string): string {
  try {
    const json = JSON.parse(extractJson(response));
    let plotValue = json.plotEssentials || response;

    // If plot essentials is an array, convert to string
    if (Array.isArray(plotValue)) {
      return plotValue.join("\n\n");
    } else if (typeof plotValue !== "string") {
      return String(plotValue);
    }

    return plotValue;
  } catch (parseError) {
    // Try to extract plotEssentials field manually
    const plotMatch = response.match(/"plotEssentials"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
    if (plotMatch) {
      return plotMatch[1]
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    }

    // Fallback: use the raw response
    return response;
  }
}

export function parseCoreSelfResponse(response: string): Array<{ title: string; core_self: string }> {
  try {
    const json = JSON.parse(extractJson(response));
    if (Array.isArray(json.coreSelfUpdates)) {
      return json.coreSelfUpdates;
    }
    return [];
  } catch (e) {
    return [];
  }
}
