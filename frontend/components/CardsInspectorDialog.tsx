import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Search, ChevronDown, ChevronRight } from "lucide-react";
import { StoryCard } from "../types";

interface CardsInspectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: StoryCard[];
  excludedCardTitles: string[];
  includedCardTitles: string[];
  onToggleExclude: (title: string) => void;
  onUpdateCards: (cards: StoryCard[]) => void;
}

export function CardsInspectorDialog({
  open,
  onOpenChange,
  cards,
  excludedCardTitles,
  includedCardTitles,
  onToggleExclude,
  onUpdateCards,
}: CardsInspectorDialogProps) {
  const [search, setSearch] = useState("");
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const updateCardValue = (title: string, newValue: string) => {
    const updatedCards = cards.map(card =>
      card.title === title ? { ...card, value: newValue } : card
    );
    onUpdateCards(updatedCards);
    setEditingCard(null);
  };

  // Deduplicate cards by title first (in case there are duplicates)
  const uniqueCards = Array.from(
    new Map(cards.map(card => [card.title, card])).values()
  );

  const filteredCards = uniqueCards.filter(
    (card) =>
      card.title.toLowerCase().includes(search.toLowerCase()) ||
      card.value.toLowerCase().includes(search.toLowerCase()) ||
      card.keys.toLowerCase().includes(search.toLowerCase())
  );

  const toggleExpand = (title: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  const isBrainCard = (card: StoryCard) =>
    card.title.toLowerCase().includes("brain") || (card.type && card.type.toLowerCase() === "brain");

  const isDefaultExcluded = (card: StoryCard) =>
    card.title.includes("Configure") || isBrainCard(card);

  const isExcluded = (card: StoryCard) => {
    // If explicitly included, override default exclusion
    if (includedCardTitles.includes(card.title)) {
      return false;
    }
    // Check if default excluded or user excluded
    return isDefaultExcluded(card) || excludedCardTitles.includes(card.title);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal={false}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-5xl max-h-[90vh] bg-slate-900 rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden z-[100] focus:outline-none">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-slate-800/50">
          <div>
            <h2 className="text-lg font-bold">Adventure Cards Inspector</h2>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredCards.length} of {uniqueCards.length} cards
            </p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border bg-slate-800/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search cards by title, content, or triggers..."
              className="w-full bg-muted/20 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-700 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Cards List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {filteredCards.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No cards found</p>
            </div>
          ) : (
            filteredCards.map((card) => {
              const excluded = isExcluded(card);
              const isExpanded = expandedCards.has(card.title);
              const canToggle = true; // All cards can now be toggled

              return (
                <div
                  key={card.title}
                  className={`border rounded-xl overflow-hidden transition-all ${
                    excluded
                      ? "border-muted/50 bg-muted/10 opacity-60"
                      : "border-border bg-slate-800/30"
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center gap-2 p-3">
                    <button
                      onClick={() => toggleExpand(card.title)}
                      className="p-1 hover:bg-muted rounded transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm truncate">
                          {card.title}
                        </h3>
                        {card.type && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                            {card.type}
                          </span>
                        )}
                      </div>
                      {card.keys && (
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          Triggers: {card.keys}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {excluded && (
                        <span className="text-[10px] px-2 py-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider font-semibold">
                          Excluded
                        </span>
                      )}
                      {canToggle && (
                        <button
                          onClick={() => onToggleExclude(card.title)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all ${
                            excluded
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30"
                              : "bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground border border-border"
                          }`}
                        >
                          {excluded ? "Include" : "Exclude"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Card Content (Expanded) */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t border-border/50">
                      <div className="bg-muted/20 rounded-lg p-3">
                        {editingCard === card.title ? (
                          <div className="space-y-2">
                            <textarea
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-full h-64 bg-background/50 border border-border rounded-lg p-2 text-xs leading-relaxed resize-none outline-none focus:ring-1 focus:ring-slate-700"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => updateCardValue(card.title, editValue)}
                                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[11px] font-semibold uppercase tracking-wider hover:bg-indigo-500 transition-all"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingCard(null)}
                                className="px-3 py-1.5 bg-muted text-muted-foreground rounded-lg text-[11px] font-semibold uppercase tracking-wider hover:bg-muted/70 transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                              {card.value || "No content"}
                            </p>
                            <button
                              onClick={() => {
                                setEditingCard(card.title);
                                setEditValue(card.value);
                              }}
                              className="mt-2 px-3 py-1 bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all"
                            >
                              Edit
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
