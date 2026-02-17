import * as Dialog from "@radix-ui/react-dialog";
import * as Accordion from "@radix-ui/react-accordion";
import * as React from "react";
import { Settings2, X, Key, Terminal, Cpu, FileText, Files, User, Lightbulb, ChevronDown, RotateCcw, ShieldAlert, Settings } from "lucide-react";
import { SearchableSelect } from "./ui/SearchableSelect";
import { DEFAULT_PROMPTS, DEFAULT_REFUSAL_PROMPT } from "../config/prompts";
import { DEFAULT_TASK_MODELS, MODEL_PRESETS } from "../config/models";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  openrouterKey: string;
  setOpenrouterKey: (key: string) => void;
  fetchModels: (key: string) => void;
  taskModels: Record<string, string>;
  setTaskModels: (updater: (prev: any) => any) => void;
  selectedPreset: string | null;
  setSelectedPreset: (preset: string | null) => void;
  customPresets: Record<string, any>;
  setCustomPresets: (presets: Record<string, any>) => void;
  openrouterModels: string[];
  prompts: Record<string, string>;
  setPrompts: (updater: (prev: any) => any) => void;
  refusalPrompt: string;
  setRefusalPrompt: (prompt: string) => void;
  requirePermissionBetweenParts: boolean;
  setRequirePermissionBetweenParts: (value: boolean) => void;
  onOpenModelConfig?: () => void;
}

export function SettingsDialog({
  open,
  onOpenChange,
  openrouterKey,
  setOpenrouterKey,
  fetchModels,
  taskModels,
  setTaskModels,
  selectedPreset,
  setSelectedPreset,
  customPresets,
  setCustomPresets,
  openrouterModels,
  prompts,
  setPrompts,
  refusalPrompt,
  setRefusalPrompt,
  requirePermissionBetweenParts,
  setRequirePermissionBetweenParts,
  onOpenModelConfig,
}: SettingsDialogProps) {
  // When dialog opens, ensure taskModels match the selected preset
  React.useEffect(() => {
    if (open && selectedPreset) {
      const modelsToLoad = customPresets[selectedPreset] || MODEL_PRESETS[selectedPreset as keyof typeof MODEL_PRESETS];
      setTaskModels(() => ({ ...modelsToLoad }));
    }
  }, [open]);

  const selectPreset = (presetName: keyof typeof MODEL_PRESETS) => {
    setSelectedPreset(presetName);

    // Load from custom presets if exists, otherwise use default preset
    const modelsToLoad = customPresets[presetName] || MODEL_PRESETS[presetName as keyof typeof MODEL_PRESETS];
    setTaskModels(() => ({ ...modelsToLoad }));
  };

  const handleModelChange = (task: string, value: string) => {
    const newModels = { ...taskModels, [task]: value };
    setTaskModels(() => newModels);

    // Save to custom presets for current preset
    if (selectedPreset) {
      setCustomPresets({
        ...customPresets,
        [selectedPreset]: newModels
      });
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-xl z-40 animate-in fade-in duration-300" />
        <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[90vw] max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border shadow-sm rounded-3xl p-8 z-50 animate-in zoom-in-95 duration-200 focus:outline-none custom-scrollbar">
          <div className="flex items-center justify-between mb-8">
            <Dialog.Title className="text-2xl font-semibold flex items-center gap-3 text-foreground">
              <Settings2 className="w-6 h-6 text-indigo-400" />
              CONFIGURATION
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-2 hover:bg-muted rounded-xl transition-all text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-8">
            {/* API Key */}
            <div className="space-y-3">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[10px] font-semibold flex items-center gap-2 uppercase tracking-[0.2em] text-muted-foreground">
                  <Key className="w-3.5 h-3.5 text-indigo-400" /> OpenRouter API Key
                </label>
                <button
                  onClick={() => setOpenrouterKey("")}
                  className="p-1.5 hover:bg-muted rounded-lg transition-all text-muted-foreground hover:text-red-400 group flex items-center gap-1.5"
                  title="Clear API Key"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-semibold uppercase tracking-wider">Clear</span>
                </button>
              </div>
              <div className="flex gap-3">
                <input
                  type="password"
                  value={openrouterKey}
                  onChange={(e) => setOpenrouterKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="flex-1 px-4 py-3 bg-muted/20 border border-border rounded-xl text-xs focus:ring-1 focus:ring-slate-700 outline-none transition-all placeholder:text-muted-foreground/50"
                />
                <button
                  onClick={() => fetchModels(openrouterKey)}
                  className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-500 active:scale-95 transition-all flex items-center gap-2 text-xs uppercase tracking-wider shadow-sm border border-indigo-500/30"
                >
                  <Terminal className="w-4 h-4" /> Fetch
                </button>
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Model Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2 uppercase tracking-widest text-foreground">
                  <Cpu className="w-5 h-5 text-indigo-400" /> AI Model Assignments
                </h3>
                <div className="flex gap-2">
                  {onOpenModelConfig && (
                    <button
                      onClick={onOpenModelConfig}
                      className="p-1.5 hover:bg-muted rounded-lg transition-all text-muted-foreground hover:text-indigo-400 group flex items-center gap-1.5"
                      title="Model Configuration"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-semibold uppercase tracking-wider">Configure</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      // Clear all custom presets
                      setCustomPresets({});
                      // Reset to default models
                      setTaskModels(() => ({ ...DEFAULT_TASK_MODELS }));
                      setSelectedPreset("default");
                    }}
                    className="p-1.5 hover:bg-muted rounded-lg transition-all text-muted-foreground hover:text-amber-400 group flex items-center gap-1.5"
                    title="Reset All Models to Defaults"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-semibold uppercase tracking-wider">Reset</span>
                  </button>
                </div>
              </div>

              {/* Model Presets Tab Bar */}
              <div className="flex gap-1 p-1 bg-muted/20 rounded-xl border border-border">
                <button
                  onClick={() => selectPreset('cheap')}
                  className={`flex-1 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    selectedPreset === 'cheap'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'hover:bg-muted/40 text-muted-foreground'
                  }`}
                >
                  Cheap
                </button>
                <button
                  onClick={() => selectPreset('default')}
                  className={`flex-1 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    selectedPreset === 'default'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'hover:bg-muted/40 text-muted-foreground'
                  }`}
                >
                  Default
                </button>
                <button
                  onClick={() => selectPreset('expensive')}
                  className={`flex-1 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    selectedPreset === 'expensive'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'hover:bg-muted/40 text-muted-foreground'
                  }`}
                >
                  Expensive
                </button>
                <button
                  onClick={() => selectPreset('veryExpensive')}
                  className={`flex-1 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    selectedPreset === 'veryExpensive'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'hover:bg-muted/40 text-muted-foreground'
                  }`}
                >
                  Very Expensive
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(taskModels).map(([task, currentModel]) => {
                  // Format task name for display
                  const formatTaskName = (name: string) => {
                    if (name === 'plotEssentials') return 'Plot Essentials';
                    if (name === 'coreSelf') return 'Core Self';
                    return name.charAt(0).toUpperCase() + name.slice(1);
                  };

                  const modelOptions = openrouterModels.length > 0
                    ? ["None", ...openrouterModels]
                    : ["None", currentModel];

                  return (
                    <SearchableSelect
                      key={task}
                      label={`${formatTaskName(task)} Model`}
                      value={currentModel}
                      onChange={(val: string) => handleModelChange(task, val)}
                      options={modelOptions}
                      icon={task === 'perspective' || task === 'title' ? User : task === 'summary' ? FileText : Files}
                    />
                  );
                })}
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Refusal Prompt */}
            <div className="space-y-3">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[10px] font-semibold flex items-center gap-2 uppercase tracking-[0.2em] text-muted-foreground">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Refusal Prompt
                </label>
                <button
                  onClick={() => setRefusalPrompt(DEFAULT_REFUSAL_PROMPT)}
                  className="p-1.5 hover:bg-muted rounded-lg transition-all text-muted-foreground hover:text-amber-400 group flex items-center gap-1.5"
                  title="Reset to Default"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-semibold uppercase tracking-wider">Reset</span>
                </button>
              </div>
              <input
                type="text"
                value={refusalPrompt}
                onChange={(e) => setRefusalPrompt(e.target.value)}
                placeholder={DEFAULT_REFUSAL_PROMPT}
                className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl text-xs focus:ring-1 focus:ring-slate-700 outline-none transition-all placeholder:text-muted-foreground/50"
              />
              <p className="text-[10px] text-muted-foreground/60 ml-1">
                Added to prompts after content refusals to help bypass filters
              </p>
            </div>

            <div className="h-px bg-border" />

            {/* Processing Options */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2 uppercase tracking-widest text-foreground ml-1">
                Processing Options
              </h3>
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-muted/20 transition-all">
                <input
                  type="checkbox"
                  checked={requirePermissionBetweenParts}
                  onChange={(e) => setRequirePermissionBetweenParts(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-indigo-500 rounded focus:ring-2 focus:ring-indigo-400"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">Require Permission Between Parts</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pause processing after each part and wait for manual confirmation before continuing to the next part
                  </p>
                </div>
              </label>
            </div>

            <div className="h-px bg-border" />

            {/* Prompt Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2 uppercase tracking-widest text-foreground">
                  <Lightbulb className="w-5 h-5 text-amber-400" /> System Prompts
                </h3>
                <button
                  onClick={() => setPrompts(() => ({ ...DEFAULT_PROMPTS }))}
                  className="p-1.5 hover:bg-muted rounded-lg transition-all text-muted-foreground hover:text-amber-400 group flex items-center gap-1.5"
                  title="Reset All Prompts to Defaults"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-semibold uppercase tracking-wider">Reset</span>
                </button>
              </div>
              <Accordion.Root type="single" collapsible className="space-y-2">
                {Object.entries(prompts).map(([task, prompt]) => {
                  // Format task name for display
                  const formatTaskName = (name: string) => {
                    if (name === 'plotEssentials') return 'Plot Essentials';
                    if (name === 'plotEssentialsWithContext') return 'Plot Essentials With Context';
                    if (name === 'coreSelf') return 'Core Self';
                    return name.charAt(0).toUpperCase() + name.slice(1);
                  };

                  return (
                    <Accordion.Item key={task} value={task} className="border border-border rounded-xl overflow-hidden bg-muted/5">
                      <Accordion.Header>
                        <Accordion.Trigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/10 transition-colors text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground group">
                          {formatTaskName(task)} Prompt
                          <ChevronDown className="w-4 h-4 group-data-[state=open]:rotate-180 transition-transform group-data-[state=open]:text-indigo-400" />
                        </Accordion.Trigger>
                      </Accordion.Header>
                      <Accordion.Content className="animate-in slide-in-from-top-1 duration-200">
                        <div className="p-4 bg-black/20">
                          <textarea
                            value={prompt}
                            onChange={(e) => setPrompts((prev: any) => ({ ...prev, [task]: e.target.value }))}
                            className="w-full h-48 bg-transparent text-[11px] font-mono outline-none resize-none custom-scrollbar leading-relaxed"
                          />
                        </div>
                      </Accordion.Content>
                    </Accordion.Item>
                  );
                })}
              </Accordion.Root>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
