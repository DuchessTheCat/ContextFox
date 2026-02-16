/**
 * AI Dungeon model mapping to OpenRouter models
 */

export const AID_MODELS = [
  // Small Models (12B)
  "Muse",
  "Wayfarer Small 2",
  "Madness",
  // Medium Models (24B)
  "Hearthfire",
  "Harbinger",
  // Large Models (70B)
  "Nova",
  "Wayfarer Large",
  "Hermes 3 70B",
  // Very Large Models
  "DeepSeek",
  "Atlas",
  "Raven",
  "Hermes 3 405B",
];

const AID_MODEL_MAPPING: Record<string, string> = {
  // Very Large Models
  Raven: "GLM-4.5",
  Atlas: "DeepSeek-V3.2",
  DeepSeek: "DeepSeek-V3.2",
  "Hermes 3 405B": "Llama-3.1-405B",
  // Large Models (70B)
  Nova: "Llama-3.3-70B-Instruct",
  "Wayfarer Large": "Llama-3.3-70B-Instruct",
  "Hermes 3 70B": "Llama-3.1-70B",
  // Medium Models (24B)
  Hearthfire: "Mistral-Small-24B-Instruct-2501",
  Harbinger: "Mistral-Small-24B-Instruct-2501",
  // Small Models (12B)
  Muse: "Mistral-Nemo-Base-2407",
  "Wayfarer Small 2": "Mistral-Nemo-Base-2407",
  Madness: "Mistral-Nemo-Base-2407",
};

export function getUnderlyingModel(aidModel: string): string {
  return AID_MODEL_MAPPING[aidModel] || aidModel;
}
