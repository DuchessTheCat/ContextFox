import { Clock, CheckCircle2, AlertCircle, Eye, Activity } from "lucide-react";
import { Task } from "../types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PipelineSidebarProps {
  tasks: Task[];
  selectedTask: Task | null;
  setSelectedTask: (task: Task | null) => void;
  isProcessing: boolean;
}

export function PipelineSidebar({
  tasks,
  selectedTask,
  setSelectedTask,
  isProcessing,
}: PipelineSidebarProps) {
  return (
    <aside className="w-72 border-r border-border bg-card/20 flex flex-col h-full overflow-hidden">
      <div className="p-6 border-b border-border bg-muted/5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
              <Activity className="w-4 h-4 text-indigo-400" />
            </div>
            <h2 className="text-[10px] font-semibold tracking-[0.2em] uppercase text-foreground">Task Pipeline</h2>
          </div>
          {isProcessing && (
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
          )}
        </div>
        <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">
          Sequential Orchestration
        </p>
      </div>

      <div className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
        {tasks.length === 0 && !isProcessing && (
          <div className="text-[10px] text-muted-foreground/50 font-medium italic text-center py-12 bg-muted/5 rounded-2xl border border-dashed border-border flex flex-col items-center gap-2">
            <Clock className="w-6 h-6 opacity-20" />
            <span>Ready to begin sequence...</span>
          </div>
        )}
        {tasks.map(task => (
          <div 
            key={task.id} 
            onClick={() => setSelectedTask(task)}
            className={cn(
              "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group",
              selectedTask?.id === task.id 
                ? "bg-indigo-500/10 border-indigo-500/30 shadow-sm"
                : "bg-muted/5 border-border hover:border-slate-700 hover:bg-muted/20"
            )}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="shrink-0">
                {task.status === 'processing' ? <Clock className="w-4 h-4 text-amber-400 animate-spin" /> : 
                 task.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : 
                 task.status === 'error' ? <AlertCircle className="w-4 h-4 text-destructive" /> : 
                 <Clock className="w-4 h-4 text-muted-foreground" />}
              </div>
              <span className={cn(
                "text-[11px] font-semibold truncate uppercase tracking-wider",
                selectedTask?.id === task.id ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
              )}>
                {task.name}
              </span>
            </div>
            <Eye className={cn(
              "w-3.5 h-3.5 transition-all",
              selectedTask?.id === task.id ? "text-indigo-400 opacity-100" : "text-muted-foreground opacity-0 group-hover:opacity-100"
            )} />
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-border bg-muted/5">
         <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
            <p className="text-[9px] font-medium text-muted-foreground/80 uppercase tracking-widest leading-relaxed">
              Select any task to inspect its output and raw AI context.
            </p>
         </div>
      </div>
    </aside>
  );
}
