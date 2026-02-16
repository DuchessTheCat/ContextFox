import * as Dialog from "@radix-ui/react-dialog";
import { Eye, X } from "lucide-react";
import { StoryState } from "../types";

interface InspectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStory: StoryState;
  updateCurrentStory: (updates: Partial<StoryState>) => void;
}

export function InspectorDialog({
  open,
  onOpenChange,
  currentStory,
  updateCurrentStory,
}: InspectorDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-xl z-40 animate-in fade-in duration-300" />
        <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[90vw] max-w-4xl max-h-[90vh] overflow-y-auto bg-card border border-border shadow-sm rounded-3xl p-8 z-50 animate-in zoom-in-95 duration-200 focus:outline-none custom-scrollbar">
          <div className="flex items-center justify-between mb-8">
            <Dialog.Title className="text-2xl font-semibold flex items-center gap-3 text-foreground uppercase tracking-tight">
              <Eye className="w-7 h-7 text-indigo-400" />
              Story Inspector: {currentStory.name}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-2 hover:bg-muted rounded-xl transition-all text-muted-foreground hover:text-foreground">
                <X className="w-6 h-6" />
              </button>
            </Dialog.Close>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
               <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground ml-1">Story Title</label>
                <input 
                  type="text"
                  value={currentStory.storyTitle}
                  onChange={(e) => updateCurrentStory({ storyTitle: e.target.value, name: e.target.value || currentStory.name })}
                  className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl text-xs outline-none focus:ring-1 focus:ring-slate-700 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground ml-1">Perspective Character</label>
                <input 
                  type="text"
                  value={currentStory.character}
                  onChange={(e) => updateCurrentStory({ character: e.target.value })}
                  className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl text-xs outline-none focus:ring-1 focus:ring-slate-700 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground ml-1">Last Line Processed</label>
                <input
                  type="text"
                  value={currentStory.lastLine}
                  onChange={(e) => updateCurrentStory({ lastLine: e.target.value })}
                  className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl text-xs outline-none focus:ring-1 focus:ring-slate-700 transition-all"
                  placeholder="Search for this string to start after..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground ml-1">Accumulated Summary</label>
                <textarea 
                  value={currentStory.accumulatedSummary}
                  onChange={(e) => updateCurrentStory({ accumulatedSummary: e.target.value })}
                  className="w-full h-80 p-4 bg-muted/20 border border-border rounded-xl text-[11px] font-mono outline-none focus:ring-1 focus:ring-slate-700 transition-all resize-none custom-scrollbar"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground ml-1">Accumulated Cards JSON</label>
              <textarea 
                value={JSON.stringify(currentStory.accumulatedCards, null, 2)}
                onChange={(e) => {
                  try {
                    updateCurrentStory({ accumulatedCards: JSON.parse(e.target.value) });
                  } catch (err) {}
                }}
                className="w-full h-full min-h-[600px] p-4 bg-muted/20 border border-border rounded-xl text-[11px] font-mono outline-none focus:ring-1 focus:ring-slate-700 transition-all resize-none custom-scrollbar"
              />
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
