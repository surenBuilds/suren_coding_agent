import React from 'react';
import { Project, AgentTask } from '../types/agent';
import { Folder, Plus, Terminal, Clock, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface SidebarProps {
  projects: Project[];
  activeProject: Project;
  onSelectProject: (project: Project) => void;
  onOpenAddProject: () => void;
  tasks: AgentTask[];
  activeTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  onSelectSlashCommand: (cmd: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  projects,
  activeProject,
  onSelectProject,
  onOpenAddProject,
  tasks,
  activeTaskId,
  onSelectTask,
  onSelectSlashCommand,
}) => {
  const slashCommands = [
    { cmd: '/inspect', desc: 'Inspect repository architecture' },
    { cmd: '/plan', desc: 'Generate task engineering plan' },
    { cmd: '/test', desc: 'Run automated test suite' },
    { cmd: '/build', desc: 'Execute project build' },
    { cmd: '/lint', desc: 'Execute lint & type checks' },
    { cmd: '/status', desc: 'Check agent system status' },
    { cmd: '/diff', desc: 'Review current git changes' },
    { cmd: '/commit', desc: 'Stage and commit changes' },
    { cmd: '/deploy', desc: 'Deploy to Vercel' },
  ];

  return (
    <aside id="sidebar-panel" className="w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col justify-between text-zinc-300 select-none shrink-0">
      <div className="p-4 space-y-6 overflow-y-auto flex-1">
        {/* PROJECTS SECTION */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-500 font-semibold">
              Projects ({projects.length})
            </h2>
            <button
              onClick={onOpenAddProject}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 hover:bg-emerald-500/10 px-1.5 py-0.5 rounded transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          <div className="space-y-1">
            {projects.map((proj) => {
              const isActive = proj.id === activeProject.id;
              return (
                <button
                  key={proj.id}
                  onClick={() => onSelectProject(proj)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all ${
                    isActive
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 shadow-sm'
                      : 'hover:bg-zinc-900 border border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Folder className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`} />
                    <span className="truncate">{proj.name}</span>
                  </div>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* SLASH COMMANDS HELPER */}
        <div>
          <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-500 font-semibold mb-2 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            Commands
          </h2>
          <div className="grid grid-cols-1 gap-1">
            {slashCommands.map((item) => (
              <button
                key={item.cmd}
                onClick={() => onSelectSlashCommand(item.cmd)}
                className="w-full text-left px-2.5 py-1.5 rounded bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/60 flex items-center justify-between group transition-colors"
              >
                <span className="font-mono text-[11px] text-indigo-300 group-hover:text-indigo-200">{item.cmd}</span>
                <span className="text-[10px] text-zinc-500 truncate max-w-[110px]">{item.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* RECENT TASK HISTORY */}
        <div>
          <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-500 font-semibold mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            Task History
          </h2>
          {tasks.length === 0 ? (
            <div className="text-xs text-zinc-600 italic px-2 py-1">No tasks executed yet</div>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {tasks.map((task) => {
                const isSelected = task.id === activeTaskId;
                return (
                  <button
                    key={task.id}
                    onClick={() => onSelectTask(task.id)}
                    className={`w-full text-left p-2 rounded-lg border text-xs transition-all ${
                      isSelected
                        ? 'bg-zinc-900 border-zinc-700 text-zinc-100'
                        : 'bg-zinc-950 hover:bg-zinc-900/60 border-zinc-800/80 text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[10px] text-zinc-500 uppercase">{task.projectId}</span>
                      {task.status === 'running' && (
                        <span className="flex items-center gap-1 text-[10px] text-amber-400">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Running
                        </span>
                      )}
                      {task.status === 'completed' && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          Done
                        </span>
                      )}
                      {task.status === 'waiting_approval' && (
                        <span className="flex items-center gap-1 text-[10px] text-amber-400 font-semibold">
                          <AlertCircle className="w-3 h-3" />
                          Approval
                        </span>
                      )}
                      {task.status === 'failed' && (
                        <span className="flex items-center gap-1 text-[10px] text-rose-400">
                          <XCircle className="w-3 h-3" />
                          Failed
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-2 text-xs text-zinc-300 font-sans">{task.userRequest}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="p-3 border-t border-zinc-800/80 bg-zinc-950 text-[11px] text-zinc-500 font-mono text-center">
        Suren Coding Agent &bull; Cloud Run Sandbox
      </div>
    </aside>
  );
};
