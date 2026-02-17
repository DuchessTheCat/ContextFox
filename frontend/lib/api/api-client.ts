/**
 * OpenRouter API client functions
 * Handles communication with OpenRouter API for model listing and completions
 */

export interface ModelContextInfo {
  models: string[];
  contextLengths: Record<string, number>;
}

export async function getOpenRouterModels(apiKey: string): Promise<ModelContextInfo> {
  const response = await fetch("https://openrouter.ai/api/v1/models", {
    headers: {
      "Authorization": `Bearer ${apiKey}`,
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.statusText}`);
  }

  const json = await response.json();
  const contextLengths: Record<string, number> = {};

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
    .map((model: any) => {
      // Store context length for each model
      contextLengths[model.id] = model.top_provider?.context_length || model.context_length || 0;
      return model.id;
    })
    .sort();

  return { models, contextLengths };
}

export interface OpenRouterOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  thinkingEnabled?: boolean;
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
}

export async function callOpenRouter(
  apiKey: string,
  model: string,
  prompt: string,
  content: string,
  options?: OpenRouterOptions
): Promise<string> {
  const requestBody: any = {
    model,
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: content },
    ],
    response_format: { type: "json_object" },
    max_tokens: options?.maxTokens || 20000,
  };

  // Add optional parameters if provided
  if (options?.temperature !== undefined) requestBody.temperature = options.temperature;
  if (options?.topP !== undefined) requestBody.top_p = options.topP;
  if (options?.topK !== undefined) requestBody.top_k = options.topK;
  if (options?.frequencyPenalty !== undefined) requestBody.frequency_penalty = options.frequencyPenalty;
  if (options?.presencePenalty !== undefined) requestBody.presence_penalty = options.presencePenalty;

  // Add reasoning parameters
  if (options?.thinkingEnabled) {
    requestBody.reasoning = {
      effort: options.reasoningEffort || "medium",
    };
  } else {
    // Explicitly disable reasoning
    requestBody.reasoning = {
      effort: "none",
    };
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed (${response.status}): ${errorText}`);
  }

  let json;
  try {
    json = await response.json();
  } catch (e) {
    throw new Error(`Failed to parse API response as JSON: ${e}`);
  }

  if (json.error) {
    throw new Error(json.error.message || JSON.stringify(json.error));
  }

  if (!json.choices || !json.choices[0]) {
    throw new Error("API response missing choices");
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
