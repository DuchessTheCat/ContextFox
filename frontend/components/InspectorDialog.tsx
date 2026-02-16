import * as Dialog from "@radix-ui/react-dialog";
import * as React from "react";
import { Eye, X, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { StoryState } from "../types";
import { loadFileContents } from "../lib/storage";
import { IS_TAURI } from "../lib/utils";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { SearchableSelect } from "./ui/SearchableSelect";

interface InspectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStory: StoryState;
  currentStoryId: string;
  updateCurrentStory: (updates: Partial<StoryState>) => void;
  onOpenCardsInspector: () => void;
  cardsInspectorOpen?: boolean;
}

export function InspectorDialog({
  open,
  onOpenChange,
  currentStory,
  currentStoryId,
  updateCurrentStory,
  onOpenCardsInspector,
  cardsInspectorOpen,
}: InspectorDialogProps) {
  const [lineValidation, setLineValidation] = React.useState<'found' | 'not-found' | null>(null);
  const [loadedContent, setLoadedContent] = React.useState<{ storyContent?: string; zipParts?: Map<number, string> }>({});

  // Load content from IndexedDB or disk when dialog opens
  React.useEffect(() => {
    if (!open) return;

    const loadContent = async () => {
      try {
        console.log('[InspectorDialog] Loading content for story:', currentStoryId);
        // Try loading from IndexedDB first
        const cached = await loadFileContents(currentStoryId);
        console.log('[InspectorDialog] Cached data:', cached);

        if (cached) {
          const loaded: { storyContent?: string; zipParts?: Map<number, string> } = {};

          if (cached.storyContent) {
            loaded.storyContent = cached.storyContent;
          }

          if (cached.zipParts) {
            // Convert plain object back to Map
            loaded.zipParts = new Map(Object.entries(cached.zipParts).map(([k, v]) => [parseInt(k), v]));
            console.log('[InspectorDialog] Loaded zipParts Map:', loaded.zipParts);
          }

          setLoadedContent(loaded);
        }

        // If Tauri and we have a path, try loading from disk
        if (IS_TAURI && currentStory.storyPath) {
          if (currentStory.isZipFile && currentStory.zipParts instanceof Map) {
            // Already have zipParts in memory
            setLoadedContent({ zipParts: currentStory.zipParts });
          } else if (!currentStory.isZipFile && currentStory.storyContent) {
            // Already have content in memory
            setLoadedContent({ storyContent: currentStory.storyContent });
          } else if (!currentStory.isZipFile) {
            // Try loading .md file from disk
            try {
              const content = await readTextFile(currentStory.storyPath);
              setLoadedContent({ storyContent: content });
            } catch (err) {
              console.error("Failed to load story content:", err);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load file contents:", err);
      }
    };

    loadContent();
  }, [open, currentStoryId, currentStory.storyPath, currentStory.isZipFile, currentStory.storyContent, currentStory.zipParts]);

  // Validate line whenever lastLine changes
  React.useEffect(() => {
    if (!currentStory.lastLine || currentStory.lastLine.trim().length === 0) {
      setLineValidation(null);
      return;
    }

    // Check if line exists in story content or zipParts
    let contentToSearch = '';

    // Use loaded content or current story content
    const storyContent = loadedContent.storyContent || currentStory.storyContent;
    const zipParts = loadedContent.zipParts || currentStory.zipParts;

    if (storyContent) {
      contentToSearch = storyContent;
    } else if (zipParts instanceof Map && zipParts.size > 0) {
      // Search across all zip parts
      const allParts = Array.from(zipParts.values()).join('\n');
      contentToSearch = allParts;
    }

    if (contentToSearch.length > 0) {
      if (contentToSearch.includes(currentStory.lastLine)) {
        setLineValidation('found');
      } else {
        setLineValidation('not-found');
      }
    } else {
      setLineValidation(null);
    }
  }, [currentStory.lastLine, currentStory.storyContent, currentStory.zipParts, loadedContent]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={`fixed inset-0 bg-black/80 backdrop-blur-xl z-40 animate-in fade-in duration-300 ${cardsInspectorOpen ? 'pointer-events-none' : ''}`} />
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

          <div className="space-y-8">
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
                  <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground ml-1">Last File Processed</label>
                  {(() => {
                    const zipParts = loadedContent.zipParts || currentStory.zipParts;
                    if (currentStory.isZipFile && zipParts instanceof Map && zipParts.size > 0) {
                      const partOptions = Array.from(zipParts.keys()).sort((a, b) => a - b).map(partNum => `Part ${partNum} of ${zipParts.size}`);
                      const currentValue = `Part ${currentStory.currentPart} of ${zipParts.size}`;
                      return (
                        <SearchableSelect
                          value={currentValue}
                          onChange={(val: string) => {
                            const match = val.match(/Part (\d+) of/);
                            if (match) {
                              updateCurrentStory({ currentPart: parseInt(match[1]) });
                            }
                          }}
                          options={partOptions}
                        />
                      );
                    } else {
                      return (
                        <div className="w-full px-4 py-3 bg-muted/20 border border-red-500 rounded-xl text-xs flex items-center gap-2 text-red-400">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Load a zip file first to set last file processed</span>
                        </div>
                      );
                    }
                  })()}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground ml-1">Last Line Processed</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={currentStory.lastLine}
                      onChange={(e) => updateCurrentStory({ lastLine: e.target.value })}
                      className={`w-full px-4 py-3 pr-10 bg-muted/20 border rounded-xl text-xs outline-none focus:ring-1 transition-all ${
                        lineValidation === 'found'
                          ? 'border-green-500 focus:ring-green-500'
                          : lineValidation === 'not-found'
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-border focus:ring-slate-700'
                      }`}
                      placeholder="Search for this string to start after..."
                    />
                    {lineValidation && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {lineValidation === 'found' ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                  {lineValidation === 'found' && (
                    <p className="text-[10px] text-green-500 ml-1">Line found</p>
                  )}
                  {lineValidation === 'not-found' && (
                    <p className="text-[10px] text-red-500 ml-1">Line not found</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground ml-1">Accumulated Summary</label>
                  <textarea
                    value={currentStory.accumulatedSummary}
                    onChange={(e) => updateCurrentStory({ accumulatedSummary: e.target.value })}
                    className="w-full h-64 p-4 bg-muted/20 border border-border rounded-xl text-[11px] font-mono outline-none focus:ring-1 focus:ring-slate-700 transition-all resize-none custom-scrollbar"
                  />
                </div>
              </div>
              <div className="flex flex-col h-full">
                <div className="space-y-2 flex-1 flex flex-col">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground ml-1">Plot Essentials</label>
                  <textarea
                    value={currentStory.plotEssentials}
                    onChange={(e) => updateCurrentStory({ plotEssentials: e.target.value })}
                    placeholder="Plot essentials will appear here after processing..."
                    className="flex-1 w-full p-4 bg-muted/20 border border-border rounded-xl text-[11px] font-mono outline-none focus:ring-1 focus:ring-slate-700 transition-all resize-none custom-scrollbar"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Accumulated Cards JSON</label>
                <button
                  onClick={onOpenCardsInspector}
                  className="p-1.5 hover:bg-muted rounded-lg transition-all text-muted-foreground hover:text-indigo-400 group flex items-center gap-1.5"
                  title="Inspect Cards"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-semibold uppercase tracking-wider">Inspect</span>
                </button>
              </div>
              <textarea
                value={JSON.stringify(currentStory.accumulatedCards, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    console.log("InspectorDialog: Parsed cards successfully", parsed);
                    updateCurrentStory({ accumulatedCards: parsed });
                  } catch (err) {
                    console.log("InspectorDialog: JSON parse error (expected while typing)", err);
                  }
                }}
                className="w-full h-96 p-4 bg-muted/20 border border-border rounded-xl text-[11px] font-mono outline-none focus:ring-1 focus:ring-slate-700 transition-all resize-none custom-scrollbar"
              />
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
