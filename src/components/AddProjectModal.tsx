import React, { useState } from 'react';
import { Project } from '../types/agent';
import { Plus, X } from 'lucide-react';

interface AddProjectModalProps {
  onAddProject: (project: Project) => void;
  onClose: () => void;
}

export const AddProjectModal: React.FC<AddProjectModalProps> = ({ onAddProject, onClose }) => {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [stack, setStack] = useState('React, TypeScript, Node.js');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !name) return;

    const newProject: Project = {
      id: id.toLowerCase().replaceAll(/\s+/g, '-'),
      name,
      description: description || 'Software project repository',
      localPath: `./projects/${id.toLowerCase()}`,
      githubRepository: githubRepo,
      defaultBranch: 'main',
      vercelProject: `${id.toLowerCase()}-web`,
      supabaseProject: `${id.toLowerCase()}-db`,
      stack: stack.split(',').map((s) => s.trim()).filter(Boolean),
      commands: { test: 'npm test', build: 'npm run build', lint: 'npm run lint' },
      memoryPath: `memory/${id.toLowerCase()}/`,
    };

    onAddProject(newProject);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-400" />
            Add New Project Registry
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
          <div>
            <label className="block text-zinc-400 font-mono mb-1">Project ID / Identifier *</label>
            <input
              type="text"
              required
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="e.g. my-app"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div>
            <label className="block text-zinc-400 font-mono mb-1">Project Display Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My App Platform"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div>
            <label className="block text-zinc-400 font-mono mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short purpose description"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div>
            <label className="block text-zinc-400 font-mono mb-1">GitHub Repository (Owner/Repo)</label>
            <input
              type="text"
              value={githubRepo}
              onChange={(e) => setGithubRepo(e.target.value)}
              placeholder="e.g. organization/repo"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div>
            <label className="block text-zinc-400 font-mono mb-1">Tech Stack (comma-separated)</label>
            <input
              type="text"
              value={stack}
              onChange={(e) => setStack(e.target.value)}
              placeholder="React, TypeScript, Express, PostgreSQL"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 font-medium hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold"
            >
              Add Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
