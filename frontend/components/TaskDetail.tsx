import * as Dialog from "@radix-ui/react-dialog";
import * as Accordion from "@radix-ui/react-accordion";
import { Terminal, X, ChevronDown, Activity, Database, FileCode } from "lucide-react";
import { Task } from "../types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TaskDetailProps {
  task: Task | null;
  onClose: () => void;
}

export function TaskDetail({ task, onClose }: TaskDetailProps) {
  return (
    <Dialog.Root open={!!task} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] animate-in fade-in duration-300" />
        <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[90vw] max-w-5xl max-h-[90vh] overflow-hidden bg-card border border-border shadow-2xl rounded-3xl z-[110] animate-in zoom-in-95 duration-200 focus:outline-none flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-border bg-muted/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                <Terminal className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <Dialog.Title className="text-lg font-semibold uppercase tracking-tight text-foreground">
                  {task?.name}
                </Dialog.Title>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mt-0.5">
                  Task Execution Details & Logs
                </p>
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="p-2 hover:bg-muted rounded-xl transition-all text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[500px]">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 ml-1">
                  <Database className="w-3.5 h-3.5 text-indigo-400" />
                  <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Context (System & Story)</label>
                </div>
                <div className="flex-1 overflow-hidden border border-border rounded-2xl flex flex-col bg-muted/5">
                  <Accordion.Root type="single" collapsible defaultValue="content" className="flex-1 overflow-y-auto custom-scrollbar">
                     <Accordion.Item value="system" className="border-b border-border">
                        <Accordion.Header>
                          <Accordion.Trigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors text-[10px] font-semibold uppercase tracking-widest text-muted-foreground group">
                            <span className="flex items-center gap-2">
                              <Activity className="w-3 h-3 group-data-[state=open]:text-indigo-400 transition-colors" />
                              System Instructions
                            </span>
                            <ChevronDown className="w-4 h-4 group-data-[state=open]:rotate-180 transition-transform" />
                          </Accordion.Trigger>
                        </Accordion.Header>
                        <Accordion.Content className="p-4 bg-black/20 font-mono text-[10px] text-foreground/80 whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar leading-relaxed border-t border-border/50">
                          {task?.context?.split("\n\nContent:\n")[0] || "No instructions"}
                        </Accordion.Content>
                     </Accordion.Item>
                     <Accordion.Item value="content" className="border-b border-border">
                        <Accordion.Header>
                          <Accordion.Trigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors text-[10px] font-semibold uppercase tracking-widest text-muted-foreground group">
                            <span className="flex items-center gap-2">
                              <FileCode className="w-3 h-3 group-data-[state=open]:text-indigo-400 transition-colors" />
                              Story Context
                            </span>
                            <ChevronDown className="w-4 h-4 group-data-[state=open]:rotate-180 transition-transform" />
                          </Accordion.Trigger>
                        </Accordion.Header>
                        <Accordion.Content className="p-4 bg-black/20 font-mono text-[10px] text-foreground/80 whitespace-pre-wrap max-h-[400px] overflow-y-auto custom-scrollbar leading-relaxed border-t border-border/50">
                          {task?.context?.split("\n\nContent:\n")[1] || "No story content"}
                        </Accordion.Content>
                     </Accordion.Item>
                  </Accordion.Root>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 ml-1">
                  <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                  <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Output</label>
                </div>
                <div className="flex-1 p-4 bg-muted/5 border border-border rounded-2xl">
                  <textarea 
                    readOnly 
                    value={task?.output || (task?.status === 'processing' ? "Waiting for output..." : "No output available")} 
                    className={cn(
                      "w-full h-full bg-transparent text-[11px] font-mono outline-none resize-none custom-scrollbar leading-relaxed transition-all",
                      task?.status === 'error' ? "text-destructive" : "text-foreground/90"
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-muted/10 border-t border-border flex justify-end">
            <Dialog.Close asChild>
              <button className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-foreground text-[11px] font-semibold uppercase tracking-widest rounded-xl transition-all border border-border">
                Close Inspector
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
