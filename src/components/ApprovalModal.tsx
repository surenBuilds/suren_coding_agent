import React from 'react';
import { ApprovalRequest, Project } from '../types/agent';
import { AlertTriangle, ShieldCheck, Check, X, FileText, Terminal } from 'lucide-react';

interface ApprovalModalProps {
  approval: ApprovalRequest;
  project: Project;
  onResolve: (approved: boolean) => void;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({ approval, project, onResolve }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-zinc-950 border border-amber-500/40 rounded-2xl p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold uppercase text-amber-400 tracking-wider">
                Action Requires Approval
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                {approval.riskLevel} RISK
              </span>
            </div>
            <h3 className="text-base font-semibold text-zinc-100 mt-1">
              Project: <span className="text-emerald-400">{project.name}</span>
            </h3>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3 text-xs font-mono text-zinc-300">
          <div>
            <span className="text-zinc-500 text-[10px] uppercase font-semibold block">Requested Action:</span>
            <span className="text-amber-300 font-semibold">{approval.action}</span>
          </div>

          <div>
            <span className="text-zinc-500 text-[10px] uppercase font-semibold block">Reason & Risk Evaluation:</span>
            <span className="text-zinc-300 font-sans leading-relaxed">{approval.reason}</span>
          </div>

          {approval.files && approval.files.length > 0 && (
            <div>
              <span className="text-zinc-500 text-[10px] uppercase font-semibold block flex items-center gap-1">
                <FileText className="w-3 h-3 text-indigo-400" />
                Affected Files:
              </span>
              <div className="text-indigo-200 text-[11px] font-mono bg-zinc-950 p-2 rounded mt-1">
                {approval.files.join(', ')}
              </div>
            </div>
          )}

          {approval.command && (
            <div>
              <span className="text-zinc-500 text-[10px] uppercase font-semibold block flex items-center gap-1">
                <Terminal className="w-3 h-3 text-amber-400" />
                Command to Execute:
              </span>
              <div className="text-amber-200 text-[11px] font-mono bg-zinc-950 p-2 rounded mt-1 overflow-x-auto">
                {approval.command}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={() => onResolve(false)}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-medium text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <X className="w-4 h-4 text-rose-400" />
            <span>Reject & Cancel</span>
          </button>

          <button
            onClick={() => onResolve(true)}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Approve & Proceed</span>
          </button>
        </div>
      </div>
    </div>
  );
};
