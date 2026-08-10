import React from 'react';
import { Project, AgentTask } from '../types/agent';
import { Rocket, ExternalLink, ShieldAlert } from 'lucide-react';

interface DeploymentsViewProps {
  project: Project;
  task: AgentTask | null;
}

export const DeploymentsView: React.FC<DeploymentsViewProps> = ({ project, task }) => {
  const deploySteps = task?.steps.filter((s) => s.stage === 'DEPLOY' || s.toolCalled === 'vercel_deploy') || [];

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 bg-zinc-950 font-sans text-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* VERCEL CARD */}
        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-zinc-100 flex items-center gap-2">
              <Rocket className="w-4 h-4 text-emerald-400" />
              Vercel Hosting
            </h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
              {project.vercelProject || 'krtlab-web'}
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Frontend & Serverless deployment pipeline. Automatic preview deployments triggered upon pull request creation.
          </p>
          <div className="pt-2 flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-500">Target Env:</span>
            <span className="text-emerald-400">Production / Preview</span>
          </div>
        </div>

        {/* SUPABASE CARD */}
        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-zinc-100 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-indigo-400" />
              Supabase Database
            </h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
              {project.supabaseProject || 'krtlab-db'}
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            PostgreSQL database, authentication schemas, and migration version tracking.
          </p>
          <div className="pt-2 flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-500">Migration Safety:</span>
            <span className="text-indigo-300">Approval Protected</span>
          </div>
        </div>
      </div>

      {/* RECENT DEPLOYMENT STEPS */}
      <div className="space-y-3">
        <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500 font-semibold">
          Deployment Activity History
        </h4>
        {deploySteps.length === 0 ? (
          <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30 text-xs text-zinc-500 italic font-mono">
            No active deployment triggers recorded for this task session. Use /deploy to initiate a Vercel build.
          </div>
        ) : (
          <div className="space-y-2 font-mono text-xs">
            {deploySteps.map((s) => (
              <div key={s.id} className="p-3 rounded-lg border border-zinc-800 bg-zinc-900 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-emerald-400 block">{s.description}</span>
                  <span className="text-[10px] text-zinc-500">{s.resultSummary}</span>
                </div>
                <ExternalLink className="w-4 h-4 text-zinc-500" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
