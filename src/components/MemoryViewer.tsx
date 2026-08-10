import React, { useState, useEffect } from 'react';
import { Project } from '../types/agent';
import { BookOpen, Save, Loader2, Check } from 'lucide-react';

interface MemoryViewerProps {
  project: Project;
}

export const MemoryViewer: React.FC<MemoryViewerProps> = ({ project }) => {
  const [memoryText, setMemoryText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetch(`/api/memory/${project.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          setMemoryText(data.memory || 'No memory files found.');
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [project.id]);

  const handleSaveMemory = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await fetch(`/api/memory/${project.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: 'architecture.md',
          content: memoryText,
        }),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch {
      // ignore
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-500 font-mono text-xs bg-zinc-950">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading project memory...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-xs text-zinc-200">
            Project Memory Context & Architectural Decisions ({project.name})
          </span>
        </div>

        <button
          onClick={handleSaveMemory}
          disabled={isSaving}
          className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 text-emerald-300 font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : saveSuccess ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span>{saveSuccess ? 'Saved' : 'Save Memory'}</span>
        </button>
      </div>

      <div className="flex-1 p-4 overflow-hidden">
        <textarea
          value={memoryText}
          onChange={(e) => setMemoryText(e.target.value)}
          className="w-full h-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500/50 leading-relaxed resize-none"
        />
      </div>
    </div>
  );
};
