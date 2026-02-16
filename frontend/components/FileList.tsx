import { FileJson, FileText, Download, Play, Terminal, Eye } from "lucide-react";
import { StoryState } from "../types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { SearchableSelect } from "./SearchableSelect";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface FileListProps {
  currentStory: StoryState;
  selectStoryFile: () => void;
  selectCardsFile: () => void;
  handleStoryFileDrop: (e: React.DragEvent) => void;
  handleCardsFileDrop: (e: React.DragEvent) => void;
  processFiles: () => void;
  isProcessing: boolean;
  storyModel: string;
  setStoryModel: (model: string) => void;
  aidModels: string[];
  onInspectCards: () => void;
}

export function FileList({
  currentStory,
  selectStoryFile,
  selectCardsFile,
  handleStoryFileDrop,
  handleCardsFileDrop,
  processFiles,
  isProcessing,
  storyModel,
  setStoryModel,
  aidModels,
  onInspectCards,
}: FileListProps) {
  return (
    <div className="space-y-4">
      {/* Main Interaction Card */}
      <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
              <FileJson className="w-5 h-5 text-indigo-400" />
            </div>
            <h2 className="text-xs font-semibold tracking-tight uppercase">Configuration & Files</h2>
          </div>
          <div className="text-[9px] font-semibold text-muted-foreground bg-muted/20 px-2 py-1 rounded-md uppercase tracking-widest border border-border">
            {currentStory.name}
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1 h-[26px]">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                    <FileText className="w-3 h-3 text-indigo-400" /> Story Source
                  </label>
                </div>
                <button
                  onClick={selectStoryFile}
                  onDrop={handleStoryFileDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="group flex flex-col gap-1 w-full p-4 bg-muted/20 border border-border rounded-2xl hover:border-slate-700 hover:bg-muted/30 transition-all text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold truncate pr-4">
                      {currentStory.storyPath ? currentStory.storyPath.split(/[\\/]/).pop() : "Select Story File..."}
                    </span>
                    <Download className="w-4 h-4 text-muted-foreground group-hover:text-indigo-400 transition-colors shrink-0" />
                  </div>
                  {currentStory.storyPath && (
                    <span className="text-[9px] text-muted-foreground/60 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                      {currentStory.storyPath}
                    </span>
                  )}
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1 h-[26px]">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                    <FileJson className="w-3 h-3 text-emerald-400" /> Adventure Cards
                  </label>
                  {currentStory.cardsPath && (
                    <button
                      onClick={onInspectCards}
                      disabled={!currentStory.accumulatedCards || currentStory.accumulatedCards.length === 0}
                      className="p-1.5 hover:bg-muted rounded-lg transition-all text-muted-foreground hover:text-emerald-400 group flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-muted-foreground"
                      title="Inspect Adventure Cards"
                    >
                      <Eye className="w-3 h-3" />
                      <span className="text-[9px] font-semibold uppercase tracking-wider">Inspect</span>
                    </button>
                  )}
                </div>
                <button
                  onClick={selectCardsFile}
                  onDrop={handleCardsFileDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="group flex flex-col gap-1 w-full p-4 bg-muted/20 border border-border rounded-2xl hover:border-slate-700 hover:bg-muted/30 transition-all text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold truncate pr-4">
                      {currentStory.cardsPath ? currentStory.cardsPath.split(/[\\/]/).pop() : "Select Cards File..."}
                    </span>
                    <Download className="w-4 h-4 text-muted-foreground group-hover:text-emerald-400 transition-colors shrink-0" />
                  </div>
                  {currentStory.cardsPath && (
                    <span className="text-[9px] text-muted-foreground/60 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                      {currentStory.cardsPath}
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 ml-1">
                <Terminal className="w-3 h-3 text-amber-400" /> Target Story Model
              </label>
              <SearchableSelect
                value={storyModel}
                onChange={setStoryModel}
                options={aidModels}
                icon={Terminal}
              />
            </div>
          </div>

          <button
            onClick={processFiles}
            disabled={isProcessing || !currentStory.storyPath}
            className={cn(
              "w-full py-4 rounded-2xl font-semibold text-sm uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all shadow-sm",
              isProcessing || !currentStory.storyPath 
                ? "bg-muted/50 text-muted-foreground cursor-not-allowed border border-border" 
                : "bg-indigo-600 text-white hover:bg-indigo-500 active:scale-[0.98] border border-indigo-500/30"
            )}
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current text-white/90" />
                Process
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
