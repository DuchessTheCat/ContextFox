/**
 * Model configuration dialog for per-model settings
 */

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, RotateCcw } from "lucide-react";
import { ModelConfig, DEFAULT_MODEL_CONFIG } from "../types/modelConfig";

interface ModelConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableModels: string[];
  modelConfigs: Record<string, ModelConfig>;
  onSaveConfig: (modelId: string, config: ModelConfig) => void;
}

export function ModelConfigDialog({
  open,
  onOpenChange,
  availableModels,
  modelConfigs,
  onSaveConfig,
}: ModelConfigDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  const filteredModels = availableModels.filter((model) =>
    model.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
  };

  const currentConfig = selectedModel
    ? (modelConfigs[selectedModel] || { modelId: selectedModel, ...DEFAULT_MODEL_CONFIG })
    : null;

  const updateConfig = (updates: Partial<ModelConfig>) => {
    if (selectedModel && currentConfig) {
      onSaveConfig(selectedModel, { ...currentConfig, ...updates });
    }
  };

  const handleResetToDefaults = () => {
    if (selectedModel) {
      onSaveConfig(selectedModel, { modelId: selectedModel, ...DEFAULT_MODEL_CONFIG });
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal={false}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-5xl max-h-[90vh] bg-slate-900 rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden z-[100] focus:outline-none">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border bg-slate-800/50">
            <div>
              <h2 className="text-lg font-bold">Model Configuration</h2>
              <p className="text-xs text-muted-foreground mt-1">Configure temperature, thinking mode, effort, and other parameters per model</p>
            </div>
            <Dialog.Close asChild>
              <button className="p-2 hover:bg-muted rounded-lg transition-all">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex gap-6 flex-1 overflow-hidden p-6">
            {/* Model list */}
            <div className="w-1/3 flex flex-col gap-3">
              <input
                type="text"
                placeholder="Search models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
              />
              <div className="flex-1 overflow-y-auto border border-border rounded-xl p-2 space-y-1 custom-scrollbar">
                {filteredModels.map((model) => (
                  <button
                    key={model}
                    onClick={() => handleSelectModel(model)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all ${
                      selectedModel === model
                        ? "bg-indigo-500 text-white"
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{model}</span>
                      {modelConfigs[model] && (
                        <span className="text-xs opacity-70">●</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Configuration panel */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {currentConfig && selectedModel ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-4 border-b border-border">
                    <h3 className="font-semibold text-lg">{selectedModel}</h3>
                    <button
                      onClick={handleResetToDefaults}
                      className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted transition-all flex items-center gap-2"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset to Defaults
                    </button>
                  </div>

                  <div className="space-y-5">
                    {/* Thinking Mode */}
                    <div className="p-4 border border-border rounded-xl bg-background/50">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={currentConfig.thinkingEnabled}
                          onChange={(e) => updateConfig({ thinkingEnabled: e.target.checked })}
                          className="mt-1 w-4 h-4 text-indigo-500 rounded focus:ring-2 focus:ring-indigo-400"
                        />
                        <div className="flex-1">
                          <div className="font-semibold">Enable Thinking Mode</div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Allow model to use extended reasoning before responding
                          </p>
                        </div>
                      </label>

                      {currentConfig.thinkingEnabled && (
                        <div className="mt-3 pl-7">
                          <label className="block text-sm font-medium mb-1.5">
                            Reasoning Effort
                          </label>
                          <select
                            value={currentConfig.reasoningEffort || "medium"}
                            onChange={(e) => updateConfig({
                              reasoningEffort: e.target.value as "minimal" | "low" | "medium" | "high" | "xhigh"
                            })}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                          >
                            <option value="minimal">Minimal (10% effort)</option>
                            <option value="low">Low (20% effort)</option>
                            <option value="medium">Medium (50% effort)</option>
                            <option value="high">High (80% effort)</option>
                            <option value="xhigh">Extra High (95% effort)</option>
                          </select>
                          <p className="text-xs text-muted-foreground mt-1">
                            Controls reasoning token budget allocation
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Temperature */}
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Temperature</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="2"
                        value={currentConfig.temperature ?? ""}
                        onChange={(e) => updateConfig({
                          temperature: e.target.value ? parseFloat(e.target.value) : undefined
                        })}
                        placeholder="Model default"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        0 = deterministic, 2 = very random
                      </p>
                    </div>

                    {/* Max Tokens */}
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Max Tokens</label>
                      <input
                        type="number"
                        value={currentConfig.maxTokens || ""}
                        onChange={(e) => updateConfig({
                          maxTokens: e.target.value ? parseInt(e.target.value) : undefined
                        })}
                        placeholder="20000"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                      />
                    </div>

                    {/* Top P */}
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Top P</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="1"
                        value={currentConfig.topP ?? ""}
                        onChange={(e) => updateConfig({
                          topP: e.target.value ? parseFloat(e.target.value) : undefined
                        })}
                        placeholder="Model default"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Nucleus sampling threshold
                      </p>
                    </div>

                    {/* Top K */}
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Top K</label>
                      <input
                        type="number"
                        value={currentConfig.topK ?? ""}
                        onChange={(e) => updateConfig({
                          topK: e.target.value ? parseInt(e.target.value) : undefined
                        })}
                        placeholder="Model default"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Sample from top K tokens
                      </p>
                    </div>

                    {/* Frequency Penalty */}
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Frequency Penalty</label>
                      <input
                        type="number"
                        step="0.1"
                        min="-2"
                        max="2"
                        value={currentConfig.frequencyPenalty ?? ""}
                        onChange={(e) => updateConfig({
                          frequencyPenalty: e.target.value ? parseFloat(e.target.value) : undefined
                        })}
                        placeholder="Model default"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Penalize repeated tokens
                      </p>
                    </div>

                    {/* Presence Penalty */}
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Presence Penalty</label>
                      <input
                        type="number"
                        step="0.1"
                        min="-2"
                        max="2"
                        value={currentConfig.presencePenalty ?? ""}
                        onChange={(e) => updateConfig({
                          presencePenalty: e.target.value ? parseFloat(e.target.value) : undefined
                        })}
                        placeholder="Model default"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Penalize new topics
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Select a model to configure
                </div>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
