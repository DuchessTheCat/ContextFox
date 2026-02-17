/**
 * Model configuration types
 */

export type ReasoningEffort = 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';

export interface ModelConfig {
  modelId: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  thinkingEnabled: boolean;
  reasoningEffort?: ReasoningEffort;
}

export const DEFAULT_MODEL_CONFIG: Omit<ModelConfig, 'modelId'> = {
  temperature: 0.7,
  maxTokens: 20000,
  topP: undefined,
  topK: undefined,
  frequencyPenalty: undefined,
  presencePenalty: undefined,
  thinkingEnabled: true,
  reasoningEffort: 'medium',
};

export function getModelConfig(modelId: string, configs: Record<string, ModelConfig>): ModelConfig {
  return configs[modelId] || { modelId, ...DEFAULT_MODEL_CONFIG };
}
