import { useState } from "react";
import { Search, ChevronDown, CheckCircle2 } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SearchableSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  label?: string;
  icon?: any;
}

export function SearchableSelect({ value, onChange, options, label, icon: Icon }: SearchableSelectProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  
  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-1.5 relative">
      {label && (
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 ml-1">
          {Icon && <Icon className="w-2.5 h-2.5 text-indigo-400" />} {label}
        </label>
      )}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg text-xs hover:bg-muted/50 transition-all border border-border"
        >
          <span className="truncate">{value || "Select model..."}</span>
          <ChevronDown className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900/95 backdrop-blur-md rounded-xl border border-border shadow-sm z-[60] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-2 border-b border-border bg-muted/20">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search models..."
                  className="w-full bg-background/50 rounded-md pl-7 pr-2 py-1.5 text-[11px] outline-none focus:ring-1 focus:ring-slate-700"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto custom-scrollbar py-1">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-4 text-center text-[10px] text-muted-foreground italic">
                  No models found
                </div>
              ) : (
                filteredOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      onChange(opt);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full px-3 py-2 text-left text-[11px] hover:bg-muted/30 transition-colors flex items-center justify-between group",
                      value === opt && "bg-indigo-500/10 text-foreground font-semibold"
                    )}
                  >
                    <span className="truncate">{opt}</span>
                    {value === opt && <CheckCircle2 className="w-3 h-3 text-indigo-400" />}
                  </button>
                )
              ))}
            </div>
          </div>
        )}
      </div>
      {isOpen && <div className="fixed inset-0 z-[55]" onClick={() => setIsOpen(false)} />}
    </div>
  );
}
