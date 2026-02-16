import * as Dialog from "@radix-ui/react-dialog";
import * as Accordion from "@radix-ui/react-accordion";
import { Settings2, X, Key, Terminal, Cpu, FileText, Files, User, Lightbulb, ChevronDown } from "lucide-react";
import { SearchableSelect } from "./SearchableSelect";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  openrouterKey: string;
  setOpenrouterKey: (key: string) => void;
  fetchModels: (key: string) => void;
  taskModels: Record<string, string>;
  setTaskModels: (updater: (prev: any) => any) => void;
  openrouterModels: string[];
  prompts: Record<string, string>;
  setPrompts: (updater: (prev: any) => any) => void;
}

export function SettingsDialog({
  open,
  onOpenChange,
  openrouterKey,
  setOpenrouterKey,
  fetchModels,
  taskModels,
  setTaskModels,
  openrouterModels,
  prompts,
  setPrompts,
}: SettingsDialogProps) {
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
              <label className="text-[10px] font-semibold flex items-center gap-2 uppercase tracking-[0.2em] text-muted-foreground ml-1">
                <Key className="w-3.5 h-3.5 text-indigo-400" /> OpenRouter API Key
              </label>
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
              <h3 className="text-sm font-semibold flex items-center gap-2 uppercase tracking-widest text-foreground">
                <Cpu className="w-5 h-5 text-indigo-400" /> AI Model Assignments
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(taskModels).map(([task, currentModel]) => (
                  <SearchableSelect 
                    key={task}
                    label={`${task} Model`}
                    value={currentModel}
                    onChange={(val: string) => setTaskModels((prev: any) => ({ ...prev, [task]: val }))}
                    options={openrouterModels.length > 0 ? openrouterModels : [currentModel]}
                    icon={task === 'perspective' || task === 'title' ? User : task === 'summary' ? FileText : Files}
                  />
                ))}
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Prompt Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2 uppercase tracking-widest text-foreground">
                <Lightbulb className="w-5 h-5 text-amber-400" /> System Prompts
              </h3>
              <Accordion.Root type="single" collapsible className="space-y-2">
                {Object.entries(prompts).map(([task, prompt]) => (
                  <Accordion.Item key={task} value={task} className="border border-border rounded-xl overflow-hidden bg-muted/5">
                    <Accordion.Header>
                      <Accordion.Trigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/10 transition-colors text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground group">
                        {task} Prompt
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
                ))}
              </Accordion.Root>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
