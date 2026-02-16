import { Plus, X, Eye, Settings, Maximize2, Minimize2, ChevronDown, Check } from "lucide-react";
import * as Select from "@radix-ui/react-select";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { StoryState } from "../types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { IS_TAURI } from "../lib/utils";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface HeaderProps {
  currentStoryId: string;
  setCurrentStoryId: (id: string) => void;
  stories: Record<string, StoryState>;
  createNewStory: () => void;
  deleteStory: (id: string) => void;
  setShowInspector: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
  isMaximized: boolean;
  setIsMaximized: (maximized: boolean) => void;
  status: string;
  isProcessing: boolean;
}

export function Header({
  currentStoryId,
  setCurrentStoryId,
  stories,
  createNewStory,
  deleteStory,
  setShowInspector,
  setShowSettings,
  isMaximized,
  setIsMaximized,
  status,
  isProcessing,
}: HeaderProps) {
  const toggleMaximize = async () => {
    if (IS_TAURI) {
      const window = getCurrentWindow();
      await window.toggleMaximize();
      setIsMaximized(await window.isMaximized());
    }
  };

  const minimize = () => {
    if (IS_TAURI) {
      getCurrentWindow().minimize();
    }
  };

  const close = () => {
    if (IS_TAURI) {
      getCurrentWindow().close();
    }
  };

  return (
    <header data-tauri-drag-region={IS_TAURI ? "true" : undefined} className="flex items-center justify-between px-4 py-2 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2" data-tauri-drag-region={IS_TAURI ? "true" : undefined}>
          <div className="w-8 h-8 flex items-center justify-center overflow-hidden" data-tauri-drag-region={IS_TAURI ? "true" : undefined}>
            <img src="contentfox.png" alt="Context Fox" className="w-full h-full object-contain" data-tauri-drag-region={IS_TAURI ? "true" : undefined} />
          </div>
          <h1 className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400" data-tauri-drag-region={IS_TAURI ? "true" : undefined}>
            Context Fox
          </h1>
        </div>

        <div className="h-6 w-px bg-border" />

        {/* Story Switcher */}
        <div className="flex items-center gap-2">
           <Select.Root value={currentStoryId} onValueChange={setCurrentStoryId}>
             <Select.Trigger 
               className="flex items-center justify-between gap-2 bg-muted/20 border border-border rounded-lg px-3 py-1 text-[11px] outline-none focus:ring-1 focus:ring-slate-700 min-w-[160px] cursor-pointer hover:bg-muted/30 transition-all text-foreground font-medium group"
             >
               <Select.Value>
                 {stories[currentStoryId]?.name || "Select Story"}
               </Select.Value>
               <Select.Icon>
                 <ChevronDown className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
               </Select.Icon>
             </Select.Trigger>

             <Select.Portal>
               <Select.Content 
                 className="overflow-hidden bg-slate-900/95 backdrop-blur-md border border-border shadow-xl rounded-xl z-[100] animate-in fade-in zoom-in-95 duration-150"
                 position="popper"
                 sideOffset={5}
               >
                 <Select.Viewport className="p-1">
                   {Object.values(stories).map((s) => (
                     <Select.Item
                       key={s.id}
                       value={s.id}
                       className={cn(
                         "relative flex items-center px-8 py-2 text-[11px] text-foreground rounded-lg cursor-pointer outline-none select-none transition-colors",
                         "hover:bg-muted",
                         currentStoryId === s.id && "bg-muted/50 font-semibold"
                       )}
                     >
                       <Select.ItemText>{s.name}</Select.ItemText>
                       <Select.ItemIndicator className="absolute left-2 inline-flex items-center justify-center text-indigo-400">
                         <Check className="w-3.5 h-3.5" />
                       </Select.ItemIndicator>
                     </Select.Item>
                   ))}
                 </Select.Viewport>
               </Select.Content>
             </Select.Portal>
           </Select.Root>

           <button onClick={createNewStory} className="p-1.5 hover:bg-muted rounded-lg transition-all text-muted-foreground hover:text-foreground" title="New Story">
             <Plus className="w-4 h-4 text-emerald-400" />
          </button>
          {Object.keys(stories).length > 1 && (
            <button onClick={() => deleteStory(currentStoryId)} className="p-1.5 hover:bg-destructive/10 rounded-lg transition-all text-muted-foreground hover:text-destructive" title="Delete Story">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => {
            if (status.toLowerCase().includes("error")) {
              alert(status);
            }
          }}
          className={cn(
            "flex items-center gap-3 px-3 py-1 bg-muted/20 rounded-full border border-border transition-all",
            status.toLowerCase().includes("error") && "cursor-pointer hover:bg-muted/30"
          )}
          disabled={!status.toLowerCase().includes("error")}
        >
          <div className={cn(
            "w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]",
            isProcessing
              ? "bg-indigo-500 animate-pulse text-indigo-500"
              : status.toLowerCase().includes("error")
              ? "bg-red-500 text-red-500"
              : "bg-emerald-500 text-emerald-500"
          )} />
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground truncate max-w-[200px]">
            {status}
          </span>
        </button>

        <div className="w-px h-4 bg-border mx-1" />

        <button
          onClick={() => setShowInspector(true)}
          className="p-2 hover:bg-muted rounded-lg transition-all text-muted-foreground hover:text-indigo-400"
          title="Inspect Story State"
        >
          <Eye className="w-4 h-4" />
        </button>

        <button 
          onClick={() => setShowSettings(true)}
          className="p-2 hover:bg-muted rounded-lg transition-all text-muted-foreground hover:text-indigo-400"
          title="Configuration"
        >
          <Settings className="w-4 h-4" />
        </button>

        {IS_TAURI && (
          <>
            <div className="w-px h-4 bg-border mx-1" />

            <button
              onClick={minimize}
              className="p-2 hover:bg-muted rounded-lg transition-all text-muted-foreground"
              title="Minimize"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={toggleMaximize}
              className="p-2 hover:bg-muted rounded-lg transition-all text-muted-foreground"
              title={isMaximized ? "Restore" : "Maximize"}
            >
              {isMaximized ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={close}
              className="p-2 hover:bg-destructive/10 rounded-lg transition-all text-muted-foreground hover:text-destructive"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </header>
  );
}
