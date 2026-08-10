import React from 'react';
import { Project } from '../types/agent';
import { Cpu, CheckCircle2, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

interface HeaderProps {
  activeProject: Project;
  currentTaskCount: number;
}

export const Header: React.FC<HeaderProps> = ({ activeProject, currentTaskCount }) => {
  const hasGemini = true; // Injected at runtime
  const hasAnthropic = Boolean(import.meta.env.VITE_ANTHROPIC_API_KEY || false);

  return (
    <header id="header-bar" className="h-16 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md px-6 flex items-center justify-between text-zinc-100 sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-sm">
            SC
          </div>
          <div>
            <h1 className="font-semibold text-sm tracking-wide text-zinc-100 flex items-center gap-2">
              Suren Coding Agent
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                v1.0 Ready
              </span>
            </h1>
            <p className="text-xs text-zinc-400 font-sans">
              Autonomous Software Engineering System
            </p>
          </div>
        </div>

        <div className="h-5 w-px bg-zinc-800 mx-1" />

        <div className="flex items-center gap-2 text-xs text-zinc-300 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg">
          <span className="text-zinc-500 font-medium">Active Project:</span>
          <span className="font-semibold text-emerald-400">{activeProject.name}</span>
          <span className="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
            {activeProject.defaultBranch}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800/80 px-3 py-1.5 rounded-lg">
          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-zinc-400">LLM Provider:</span>
          <span className="font-mono text-indigo-300 font-medium">Gemini 3.6 Flash</span>
        </div>

        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800/80 px-3 py-1.5 rounded-lg">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-zinc-400">Security Guard:</span>
          <span className="font-mono text-emerald-400">SAFE + APPROVALS</span>
        </div>

        <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800/80 px-3 py-1.5 rounded-lg text-zinc-300 font-mono text-xs">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Tasks: {currentTaskCount}</span>
        </div>
      </div>
    </header>
  );
};
