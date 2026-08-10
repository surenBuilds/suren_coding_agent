import fs from 'fs/promises';
import path from 'path';
import { AgentTask, AgentStep, FileDiff, CommandLog, ApprovalRequest, TaskStage, TaskStatus } from '../types/agent';

export type EventListener = (task: AgentTask, step?: AgentStep) => void;

export class TaskStore {
  private static tasks: Map<string, AgentTask> = new Map();
  private static listeners: Set<EventListener> = new Set();
  private static storageFile = path.resolve(process.cwd(), 'tasks.json');

  public static async init() {
    try {
      const data = await fs.readFile(this.storageFile, 'utf-8');
      const parsed: AgentTask[] = JSON.parse(data);
      for (const t of parsed) {
        this.tasks.set(t.id, t);
      }
    } catch {
      // File doesn't exist yet
    }
  }

  public static subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private static async persist() {
    try {
      const list = Array.from(this.tasks.values());
      await fs.writeFile(this.storageFile, JSON.stringify(list, null, 2), 'utf-8');
    } catch {
      // Ignore write errors
    }
  }

  private static notify(task: AgentTask, step?: AgentStep) {
    for (const listener of this.listeners) {
      try {
        listener(task, step);
      } catch (e) {
        console.error('[TaskStore listener error]', e);
      }
    }
    this.persist();
  }

  public static createTask(projectId: string, userRequest: string, maxIterations: number = 20): AgentTask {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const task: AgentTask = {
      id: taskId,
      projectId,
      userRequest,
      startTime: new Date().toISOString(),
      status: 'idle',
      currentStage: 'UNDERSTAND',
      steps: [],
      diffs: [],
      commandsExecuted: [],
      currentIteration: 0,
      maxIterations,
    };

    this.tasks.set(taskId, task);
    this.notify(task);
    return task;
  }

  public static getTask(taskId: string): AgentTask | undefined {
    return this.tasks.get(taskId);
  }

  public static getAllTasks(): AgentTask[] {
    return Array.from(this.tasks.values()).sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  }

  public static updateStage(taskId: string, stage: TaskStage) {
    const task = this.tasks.get(taskId);
    if (!task) return;
    task.currentStage = stage;
    this.notify(task);
  }

  public static addStep(taskId: string, step: Omit<AgentStep, 'id' | 'timestamp'>): AgentStep {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const fullStep: AgentStep = {
      id: `step_${Date.now()}_${task.steps.length + 1}`,
      timestamp: new Date().toISOString(),
      ...step,
    };

    task.steps.push(fullStep);
    this.notify(task, fullStep);
    return fullStep;
  }

  public static addCommandLog(taskId: string, log: CommandLog) {
    const task = this.tasks.get(taskId);
    if (!task) return;
    task.commandsExecuted.push(log);
    this.notify(task);
  }

  public static updateDiffs(taskId: string, diffs: FileDiff[]) {
    const task = this.tasks.get(taskId);
    if (!task) return;
    task.diffs = diffs;
    this.notify(task);
  }

  public static setApprovalRequired(taskId: string, approval: ApprovalRequest) {
    const task = this.tasks.get(taskId);
    if (!task) return;
    task.status = 'waiting_approval';
    task.approvalRequired = approval;
    this.notify(task);
  }

  public static resolveApproval(taskId: string, approved: boolean): boolean {
    const task = this.tasks.get(taskId);
    if (!task || !task.approvalRequired) return false;

    task.approvalRequired.status = approved ? 'approved' : 'rejected';
    task.approvalRequired.resolvedAt = new Date().toISOString();

    if (approved) {
      task.status = 'running';
    } else {
      task.status = 'failed';
      task.error = 'Task cancelled by user rejecting approval request.';
    }

    this.notify(task);
    return true;
  }

  public static completeTask(taskId: string, finalReport: string) {
    const task = this.tasks.get(taskId);
    if (!task) return;
    task.status = 'completed';
    task.endTime = new Date().toISOString();
    task.finalReport = finalReport;
    this.notify(task);
  }

  public static failTask(taskId: string, error: string) {
    const task = this.tasks.get(taskId);
    if (!task) return;
    task.status = 'failed';
    task.endTime = new Date().toISOString();
    task.error = error;
    this.notify(task);
  }
}
