import React from 'react';
import { CommandLog } from '../types/agent';
import { Terminal, CheckCircle2, XCircle } from 'lucide-react';

interface TerminalViewProps {
  logs: CommandLog[];
}

export const TerminalView: React.FC<TerminalViewProps> = ({ logs }) => {
  if (!logs || logs.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-zinc-500 font-mono text-xs p-8 text-center bg-zinc-950">
        <Terminal className="w-8 h-8 mb-2 text-zinc-700" />
        No terminal commands executed yet.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 bg-zinc-950 font-mono text-xs">
      {logs.map((log) => (
        <div key={log.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
          <div className="px-4 py-2 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">$</span>
              <span className="text-indigo-300 font-semibold">{log.command}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-500">{log.durationMs}ms</span>
              {log.exitCode === 0 ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
              )}
            </div>
          </div>

          <div className="p-4 bg-zinc-950 space-y-2 overflow-x-auto">
            {log.stdout && (
              <div>
                <span className="text-zinc-500 text-[10px] uppercase font-semibold block mb-1">STDOUT:</span>
                <pre className="text-zinc-300 whitespace-pre-wrap text-[11px]">{log.stdout}</pre>
              </div>
            )}
            {log.stderr && (
              <div>
                <span className="text-rose-400 text-[10px] uppercase font-semibold block mb-1">STDERR:</span>
                <pre className="text-rose-300 whitespace-pre-wrap text-[11px]">{log.stderr}</pre>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
