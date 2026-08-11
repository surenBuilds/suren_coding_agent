import React, { useState } from 'react';
import { Project, AgentTask } from '../types/agent';
import { Send, Sparkles, AlertCircle, CheckCircle2, ArrowRight, Loader2, Bot, User } from 'lucide-react';

interface ChatViewProps {
  activeProject: Project;
  activeTask: AgentTask | null;
  onSubmitPrompt: (prompt: string) => void;
  isLoading: boolean;
}

export const ChatView: React.FC<ChatViewProps> = ({
  activeProject,
  activeTask,
  onSubmitPrompt,
  isLoading,
}) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;
    onSubmitPrompt(prompt.trim());
    setPrompt('');
  };

  const samplePrompts = [
    `Fix the AI Mentor persistence problem in ${activeProject.name}.`,
    `Inspect ${activeProject.name} architecture and run lint and build tests.`,
    `Check why ${activeProject.name} build is failing and generate patch.`,
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-hidden">
      {/* CHAT MESSAGES STREAM */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {!activeTask ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>

            <div>
              <h2 className="text-xl font-semibold text-zinc-100 tracking-tight mb-2">
                Ready for Engineering Task on <span className="text-emerald-400">{activeProject.name}</span>
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Provide a natural language feature request, bug fix, or slash command. Suren Coding Agent will inspect, plan, modify code, run tests, and verify deployment.
              </p>
            </div>

            <div className="w-full space-y-2 text-left">
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider font-semibold block">
                Quick Sample Prompts
              </span>
              <div className="grid grid-cols-1 gap-2">
                {samplePrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => setPrompt(p)}
                    className="p-3 rounded-lg bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:text-zinc-100 flex items-center justify-between group transition-all text-left"
                  >
                    <span>{p}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* USER REQUEST MSG */}
            <div className="flex items-start gap-3 bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 text-xs font-mono">
                <User className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-zinc-300">User Prompt</span>
                  <span className="text-[10px] font-mono text-zinc-500">{activeTask.startTime}</span>
                </div>
                <p className="text-sm text-zinc-200 font-sans leading-relaxed">{activeTask.userRequest}</p>
              </div>
            </div>

            {/* AGENT STATUS CARD */}
            <div className="flex items-start gap-3 bg-zinc-950 border border-zinc-800/80 p-4 rounded-xl">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 text-xs font-mono">
                <Bot className="w-4 h-4" />
              </div>

              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-2">
                    Suren Coding Agent
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                      Iteration {activeTask.currentIteration} / {activeTask.maxIterations}
                    </span>
                  </span>

                  <span className="text-xs font-mono px-2.5 py-1 rounded-md uppercase font-semibold border flex items-center gap-1.5 bg-zinc-900 border-zinc-700 text-zinc-300">
                    {activeTask.status === 'running' && <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />}
                    {activeTask.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                    {activeTask.status === 'waiting_approval' && <AlertCircle className="w-3 h-3 text-amber-400" />}
                    {activeTask.currentStage}
                  </span>
                </div>

                {/* FINAL REPORT OR SUMMARY */}
                {activeTask.status === 'failed' ? (
                  <div className="p-4 rounded-lg bg-red-950/40 border border-red-500/30 text-sm text-red-200 font-mono whitespace-pre-wrap leading-relaxed">
                    ❌ Task failed: {activeTask.error || 'Unknown error'}
                  </div>
                ) : activeTask.finalReport ? (
                  <div className="p-4 rounded-lg bg-zinc-900/90 border border-emerald-500/30 text-sm text-zinc-200 font-mono whitespace-pre-wrap leading-relaxed">
                    {activeTask.finalReport}
                  </div>
                ) : (
                  <div className="text-xs text-zinc-400 leading-relaxed font-sans">
                    Executing autonomous workflow steps. View live tool logs in the Activity tab below.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* INPUT FORM */}
      <div className="p-4 border-t border-zinc-800/80 bg-zinc-950">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`Ask Suren Agent to engineer ${activeProject.name}... (e.g. "Fix AI Mentor persistence")`}
              disabled={isLoading}
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all font-sans"
            />
          </div>

          <button
            type="submit"
            disabled={!prompt.trim() || isLoading}
            className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-semibold text-sm flex items-center gap-2 transition-all shadow-md shrink-0 cursor-pointer"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Execute</span>
          </button>
        </form>
      </div>
    </div>
  );
};
