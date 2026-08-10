import React from 'react';
import { FileDiff } from '../types/agent';
import { FileCode, PlusCircle, MinusCircle } from 'lucide-react';

interface DiffViewerProps {
  diffs: FileDiff[];
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ diffs }) => {
  if (!diffs || diffs.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-zinc-500 font-mono text-xs p-8 text-center bg-zinc-950">
        <FileCode className="w-8 h-8 mb-2 text-zinc-700" />
        No code changes recorded in current workspace task yet.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 bg-zinc-950 font-mono text-xs">
      {diffs.map((diff, idx) => (
        <div key={idx} className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
          <div className="px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between text-zinc-300">
            <span className="font-semibold text-emerald-400">{diff.filePath}</span>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-emerald-400 flex items-center gap-1">
                <PlusCircle className="w-3 h-3" />
                +{diff.additions}
              </span>
              <span className="text-rose-400 flex items-center gap-1">
                <MinusCircle className="w-3 h-3" />
                -{diff.deletions}
              </span>
            </div>
          </div>

          <div className="p-4 bg-zinc-950 overflow-x-auto">
            <pre className="text-[11px] leading-relaxed whitespace-pre font-mono">
              {diff.diffContent.split('\n').map((line, lIdx) => {
                let colorClass = 'text-zinc-400';
                if (line.startsWith('+') && !line.startsWith('+++')) colorClass = 'text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded';
                if (line.startsWith('-') && !line.startsWith('---')) colorClass = 'text-rose-400 bg-rose-500/10 px-1 py-0.5 rounded';
                if (line.startsWith('@@')) colorClass = 'text-indigo-400 font-semibold';

                return (
                  <div key={lIdx} className={colorClass}>
                    {line}
                  </div>
                );
              })}
            </pre>
          </div>
        </div>
      ))}
    </div>
  );
};
