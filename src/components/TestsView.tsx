import React from 'react';
import { AgentTask } from '../types/agent';
import { TestTube, CheckCircle2, XCircle } from 'lucide-react';

interface TestsViewProps {
  task: AgentTask | null;
}

export const TestsView: React.FC<TestsViewProps> = ({ task }) => {
  const testSteps = task?.steps.filter((s) => s.stage === 'TEST' || s.toolCalled === 'run_tests' || s.toolCalled === 'run_lint') || [];

  if (testSteps.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-zinc-500 font-mono text-xs p-8 text-center bg-zinc-950">
        <TestTube className="w-8 h-8 mb-2 text-zinc-700" />
        No test runs recorded for current task. Use /test or request a test execution.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 bg-zinc-950 font-mono text-xs">
      {testSteps.map((step) => (
        <div key={step.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-indigo-300">{step.description}</span>
            {step.success ? (
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> PASSED
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] flex items-center gap-1">
                <XCircle className="w-3 h-3" /> FAILED
              </span>
            )}
          </div>

          {step.resultSummary && (
            <div className="p-3 rounded bg-zinc-950 border border-zinc-800/80 text-[11px] text-zinc-300 whitespace-pre-wrap">
              {step.resultSummary}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
