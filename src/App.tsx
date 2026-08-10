import React, { useState, useEffect } from 'react';
import { Project, AgentTask } from './types/agent';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { ActivityPanel } from './components/ActivityPanel';
import { DiffViewer } from './components/DiffViewer';
import { TerminalView } from './components/TerminalView';
import { TestsView } from './components/TestsView';
import { DeploymentsView } from './components/DeploymentsView';
import { MemoryViewer } from './components/MemoryViewer';
import { ApprovalModal } from './components/ApprovalModal';
import { AddProjectModal } from './components/AddProjectModal';
import {
  MessageSquare,
  Activity,
  FolderTree,
  GitCompare,
  Terminal as TerminalIcon,
  TestTube,
  Rocket,
  BookOpen,
} from 'lucide-react';

type TabType = 'chat' | 'activity' | 'files' | 'diff' | 'terminal' | 'tests' | 'deployments' | 'memory';

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAddProjectOpen, setIsAddProjectOpen] = useState<boolean>(false);

  // Load Initial Projects & Tasks
  useEffect(() => {
    fetch('/api/projects')
      .then((res) => res.json())
      .then((data: Project[]) => {
        setProjects(data);
        if (data.length > 0) {
          setActiveProject(data[0]);
        }
      })
      .catch((err) => console.error('Failed to load projects', err));

    fetch('/api/tasks')
      .then((res) => res.json())
      .then((data: AgentTask[]) => {
        setTasks(data);
        if (data.length > 0) {
          setActiveTaskId(data[0].id);
        }
      })
      .catch((err) => console.error('Failed to load tasks', err));
  }, []);

  const activeTask = tasks.find((t) => t.id === activeTaskId) || null;

  // SSE Real-Time Event Stream for Active Task
  useEffect(() => {
    if (!activeTaskId) return;

    const eventSource = new EventSource(`/api/tasks/${activeTaskId}/events`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.task) {
          setTasks((prev) => {
            const idx = prev.findIndex((t) => t.id === data.task.id);
            if (idx === -1) return [data.task, ...prev];
            const copy = [...prev];
            copy[idx] = data.task;
            return copy;
          });

          if (data.task.status !== 'running') {
            setIsLoading(false);
          }
        }
      } catch (err) {
        console.error('SSE JSON error', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [activeTaskId]);

  const handleSubmitPrompt = async (promptText: string) => {
    if (!activeProject) return;
    setIsLoading(true);

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          projectId: activeProject.id,
        }),
      });

      const data = await res.json();
      if (data.taskId) {
        setActiveTaskId(data.taskId);
        // Refresh tasks
        const tasksRes = await fetch('/api/tasks');
        setTasks(await tasksRes.json());
      }
    } catch (err) {
      console.error('Task submission error', err);
      setIsLoading(false);
    }
  };

  const handleResolveApproval = async (approved: boolean) => {
    if (!activeTask) return;

    try {
      await fetch(`/api/tasks/${activeTask.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved }),
      });

      // Refresh task
      const taskRes = await fetch(`/api/tasks/${activeTask.id}`);
      const updated = await taskRes.json();
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err) {
      console.error('Approval resolution error', err);
    }
  };

  const handleAddProject = async (newProj: Project) => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProj),
      });

      const data = await res.json();
      if (data.project) {
        setProjects((prev) => [...prev, data.project]);
        setActiveProject(data.project);
        setIsAddProjectOpen(false);
      }
    } catch (err) {
      console.error('Add project error', err);
    }
  };

  if (!activeProject) {
    return (
      <div className="h-screen w-screen bg-zinc-950 text-zinc-300 flex items-center justify-center font-mono text-xs">
        Initializing Suren Coding Agent...
      </div>
    );
  }

  const navTabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { id: 'activity', label: 'Activity', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'diff', label: 'Diff', icon: <GitCompare className="w-3.5 h-3.5" /> },
    { id: 'terminal', label: 'Terminal', icon: <TerminalIcon className="w-3.5 h-3.5" /> },
    { id: 'tests', label: 'Tests', icon: <TestTube className="w-3.5 h-3.5" /> },
    { id: 'deployments', label: 'Deployments', icon: <Rocket className="w-3.5 h-3.5" /> },
    { id: 'memory', label: 'Memory', icon: <BookOpen className="w-3.5 h-3.5" /> },
  ];

  return (
    <div id="app-root" className="h-screen w-screen flex flex-col bg-zinc-950 font-sans text-zinc-100 overflow-hidden">
      {/* HEADER BAR */}
      <Header activeProject={activeProject} currentTaskCount={tasks.length} />

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR */}
        <Sidebar
          projects={projects}
          activeProject={activeProject}
          onSelectProject={(p) => setActiveProject(p)}
          onOpenAddProject={() => setIsAddProjectOpen(true)}
          tasks={tasks}
          activeTaskId={activeTaskId}
          onSelectTask={(id) => setActiveTaskId(id)}
          onSelectSlashCommand={(cmd) => handleSubmitPrompt(cmd)}
        />

        {/* WORKSPACE CONTENT */}
        <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden">
          {/* TABS HEADER */}
          <div className="h-11 border-b border-zinc-800 bg-zinc-950 px-4 flex items-center gap-1 shrink-0">
            {navTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-zinc-900 text-emerald-400 border border-zinc-700 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.id === 'activity' && activeTask && activeTask.steps.length > 0 && (
                    <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300">
                      {activeTask.steps.length}
                    </span>
                  )}
                  {tab.id === 'diff' && activeTask && activeTask.diffs.length > 0 && (
                    <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300">
                      {activeTask.diffs.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ACTIVE TAB CONTENT */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'chat' && (
              <ChatView
                activeProject={activeProject}
                activeTask={activeTask}
                onSubmitPrompt={handleSubmitPrompt}
                isLoading={isLoading}
              />
            )}

            {activeTab === 'activity' && <ActivityPanel task={activeTask} />}

            {activeTab === 'diff' && <DiffViewer diffs={activeTask?.diffs || []} />}

            {activeTab === 'terminal' && <TerminalView logs={activeTask?.commandsExecuted || []} />}

            {activeTab === 'tests' && <TestsView task={activeTask} />}

            {activeTab === 'deployments' && <DeploymentsView project={activeProject} task={activeTask} />}

            {activeTab === 'memory' && <MemoryViewer project={activeProject} />}
          </div>
        </div>
      </div>

      {/* HIGH RISK APPROVAL MODAL */}
      {activeTask && activeTask.status === 'waiting_approval' && activeTask.approvalRequired && (
        <ApprovalModal
          approval={activeTask.approvalRequired}
          project={activeProject}
          onResolve={handleResolveApproval}
        />
      )}

      {/* ADD PROJECT MODAL */}
      {isAddProjectOpen && (
        <AddProjectModal
          onAddProject={handleAddProject}
          onClose={() => setIsAddProjectOpen(false)}
        />
      )}
    </div>
  );
}
