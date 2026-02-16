import { FileJson, FileText, Download, Copy, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { StoryState } from "../types";

interface ResultsPanelProps {
  currentStory: StoryState;
  updateCurrentStory: (updates: Partial<StoryState>) => void;
  saveCards: () => void;
}

export function ResultsPanel({
  currentStory,
  updateCurrentStory,
  saveCards,
}: ResultsPanelProps) {
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedCards, setCopiedCards] = useState(false);

  const copyToClipboard = async (text: string, setCopied: (v: boolean) => void) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
            <FileJson className="w-5 h-5 text-indigo-400" />
          </div>
          <h2 className="text-xs font-semibold tracking-tight uppercase">Orchestrated Results</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-3">
          <div className="flex items-center justify-between ml-1">
            <label className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-indigo-400" /> Accumulated Summary
            </label>
            <button 
              onClick={() => copyToClipboard(currentStory.accumulatedSummary, setCopiedSummary)}
              className="p-1.5 hover:bg-muted rounded-lg transition-all text-muted-foreground hover:text-indigo-400 group flex items-center gap-2"
              title="Copy Summary to Clipboard"
            >
              {copiedSummary ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />}
              <span className="text-[10px] font-semibold uppercase tracking-wider">{copiedSummary ? "Copied" : "Copy"}</span>
            </button>
          </div>
          <textarea 
            value={currentStory.accumulatedSummary}
            onChange={(e) => updateCurrentStory({ accumulatedSummary: e.target.value })}
            placeholder="No summary generated yet..."
            className="w-full h-[500px] p-5 bg-muted/5 border border-border rounded-2xl text-[11px] font-mono outline-none focus:ring-1 focus:ring-slate-700 transition-all resize-none custom-scrollbar leading-relaxed"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between ml-1">
            <label className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <FileJson className="w-3.5 h-3.5 text-emerald-400" /> Story Cards JSON
            </label>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => copyToClipboard(JSON.stringify(currentStory.accumulatedCards, null, 2), setCopiedCards)}
                className="p-1.5 hover:bg-muted rounded-lg transition-all text-muted-foreground hover:text-indigo-400 group flex items-center gap-2"
                title="Copy Cards to Clipboard"
              >
                {copiedCards ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />}
                <span className="text-[10px] font-semibold uppercase tracking-wider">{copiedCards ? "Copied" : "Copy"}</span>
              </button>
              <button 
                onClick={saveCards}
                className="p-1.5 hover:bg-muted rounded-lg transition-all text-muted-foreground hover:text-emerald-400 group flex items-center gap-2"
                title="Save Cards to File"
              >
                <Download className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">Save</span>
              </button>
            </div>
          </div>
          <textarea 
            value={JSON.stringify(currentStory.accumulatedCards, null, 2)}
            onChange={(e) => {
              try {
                updateCurrentStory({ accumulatedCards: JSON.parse(e.target.value) });
              } catch (err) {}
            }}
            placeholder="[]"
            className="w-full h-[500px] p-5 bg-muted/5 border border-border rounded-2xl text-[11px] font-mono outline-none focus:ring-1 focus:ring-slate-700 transition-all resize-none custom-scrollbar leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
}
