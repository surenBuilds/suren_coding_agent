import React from 'react';
import { AgentStep, AgentTask } from '../types/agent';
import { Terminal, CheckCircle2, XCircle, Clock, ShieldAlert, Cpu } from 'lucide-react';

interface ActivityPanelProps {
  task: AgentTask | null;
}

export const ActivityPanel: React.FC<ActivityPanelProps> = ({ task }) => {
  if (!task || task.steps.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-zinc-500 font-mono text-xs p-8 text-center">
        <Terminal className="w-8 h-8 mb-2 text-zinc-700" />
        No activity steps logged yet. Start a task to observe agent execution.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-3 font-mono text-xs bg-zinc-950">
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-zinc-400">
        <span className="font-semibold text-zinc-200">Activity Stream ({task.steps.length} steps)</span>
        <span className="text-[10px]">Task ID: {task.id}</span>
      </div>

      <div className="space-y-2">
        {task.steps.map((step) => {
          const time = new Date(step.timestamp).toLocaleTimeString();
          return (
            <div
              key={step.id}
              className="p-3 rounded-lg bg-zinc-900/70 border border-zinc-800/80 space-y-1.5 transition-all hover:bg-zinc-900"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500">{time}</span>
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-indigo-300 font-semibold text-[10px] uppercase">
                    {step.stage}
                  </span>
                  {step.toolCalled && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                      {step.toolCalled}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {step.durationMs !== undefined && (
                    <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {step.durationMs}ms
                    </span>
                  )}
                  {step.success ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                  )}
                </div>
              </div>

              <p className="text-zinc-200 font-sans text-xs">{step.description}</p>

              {step.toolArgs && (
                <div className="p-2 rounded bg-zinc-950 border border-zinc-800/60 text-[11px] text-zinc-400 overflow-x-auto">
                  <span className="text-zinc-500 font-semibold block mb-0.5">Arguments:</span>
                  <pre className="whitespace-pre-wrap font-mono text-[10px] text-indigo-200">
                    {JSON.stringify(step.toolArgs, null, 2)}
                  </pre>
                </div>
              )}

              {step.resultSummary && (
                <div className="p-2 rounded bg-zinc-950/80 border border-zinc-800/60 text-[10px] text-zinc-300">
                  <span className="text-zinc-500 font-semibold block mb-0.5">Output Summary:</span>
                  <div className="line-clamp-4 font-mono whitespace-pre-wrap">{step.resultSummary}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
