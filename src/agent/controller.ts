import { AgentTask, Project, LLMMessage, TaskStage } from '../types/agent';
import { LLMFactory } from '../llm/factory';
import { LLMProvider } from '../llm/provider';
import { TaskStore } from './taskStore';
import { ALL_TOOLS, executeTool } from '../tools';
import { PermissionManager } from '../security/permissions';
import { MemoryManager } from '../memory/memoryManager';
import { AgentRouter } from './router';

export class AgentController {
  private taskId: string;
  private project: Project;
  private baseCwd: string;
  private provider: LLMProvider;

  constructor(taskId: string, project: Project, baseCwd: string = process.cwd()) {
    this.taskId = taskId;
    this.project = project;
    this.baseCwd = baseCwd;
    this.provider = LLMFactory.getProvider();
  }

  public async runTask(): Promise<AgentTask> {
    const task = TaskStore.getTask(this.taskId);
    if (!task) throw new Error(`Task ${this.taskId} not found`);

    task.status = 'running';
    TaskStore.updateStage(this.taskId, 'UNDERSTAND');

    try {
      // 1. UNDERSTAND
      TaskStore.addStep(this.taskId, {
        stage: 'UNDERSTAND',
        description: `Analyzing request for project ${this.project.name}`,
        resultSummary: `Project ${this.project.name} selected (${this.project.stack.join(', ')})`,
        success: true,
      });

      // Load Memory
      const memoryContent = await MemoryManager.loadProjectMemory(this.project.memoryPath, this.baseCwd);

      // System Instruction
      const systemInstruction = `You are "Suren Coding Agent", an autonomous senior software engineer.
You are tasked with engineering project "${this.project.name}" (${this.project.stack.join(', ')}).

PROJECT MEMORY & ARCHITECTURE:
${memoryContent}

COMMAND CONFIGURATION:
Test Command: ${this.project.commands.test || 'npm test'}
Build Command: ${this.project.commands.build || 'npm run build'}
Lint Command: ${this.project.commands.lint || 'npm run lint'}

Your primary goal is to complete the user request rigorously across:
UNDERSTAND -> INSPECT -> PLAN -> MODIFY -> TEST -> DIAGNOSE -> FIX -> VERIFY -> COMMIT -> DEPLOY.

RULES:
1. Always inspect files and project layout before modifying.
2. Edit the minimum necessary set of files.
3. Test and build your changes to verify correctness.
4. If a test or build fails, read the error output carefully, diagnose the root cause, and apply a fix.
5. Do NOT lie or claim an operation succeeded unless verified.
6. Provide concise, factual tool calls.`;

      const messages: LLMMessage[] = [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: `Task Request: ${task.userRequest}` },
      ];

      // 2. INSPECT & PLAN Loop
      TaskStore.updateStage(this.taskId, 'INSPECT');

      let iteration = 0;
      const maxIterations = task.maxIterations || 20;

      while (iteration < maxIterations) {
        iteration++;
        task.currentIteration = iteration;

        // Check if waiting for approval
        if (task.status === 'waiting_approval') {
          // Pause execution until user approves or rejects
          return task;
        }

        const llmResponse = await this.provider.generate(messages, ALL_TOOLS, {
          temperature: 0.1,
          systemInstruction,
        });

        if (llmResponse.content) {
          messages.push({ role: 'assistant', content: llmResponse.content });
        }

        // If no tool calls, model considers task finished or needs user input
        if (!llmResponse.toolCalls || llmResponse.toolCalls.length === 0) {
          // Perform final test & build verification if code was modified
          if (task.steps.some((s) => s.stage === 'MODIFY')) {
            TaskStore.updateStage(this.taskId, 'VERIFY');
            const verifyBuild = await executeTool('run_build', { command: this.project.commands.build }, this.baseCwd);

            TaskStore.addStep(this.taskId, {
              stage: 'VERIFY',
              description: 'Executing final build verification',
              toolCalled: 'run_build',
              resultSummary: verifyBuild.success ? 'Build succeeded cleanly' : `Build output: ${verifyBuild.stderr || verifyBuild.stdout}`,
              success: verifyBuild.success,
            });
          }

          const finalReport = llmResponse.content || 'Task completed successfully.';
          TaskStore.completeTask(this.taskId, finalReport);
          return task;
        }

        // Execute Tool Calls
        for (const call of llmResponse.toolCalls) {
          const toolName = call.name;
          const toolArgs = call.args;

          // Determine stage mapping
          let stage: TaskStage = 'MODIFY';
          if (['list_files', 'read_file', 'search_code', 'github_get_file'].includes(toolName)) stage = 'INSPECT';
          if (['run_tests', 'run_build', 'run_lint'].includes(toolName)) stage = 'TEST';
          if (['git_commit', 'git_create_branch'].includes(toolName)) stage = 'COMMIT';
          if (['vercel_deploy', 'supabase_create_migration'].includes(toolName)) stage = 'DEPLOY';

          TaskStore.updateStage(this.taskId, stage);

          // Check permissions & approval requirements
          const approvalCheck = PermissionManager.requiresApproval(toolName, toolArgs, true);

          if (approvalCheck.requiresApproval) {
            const approvalReq = PermissionManager.createApprovalRequest(
              this.taskId,
              this.project.id,
              toolName,
              approvalCheck.riskLevel,
              approvalCheck.reason,
              toolArgs.filePath ? [toolArgs.filePath] : undefined,
              toolArgs.command
            );

            TaskStore.setApprovalRequired(this.taskId, approvalReq);
            TaskStore.addStep(this.taskId, {
              stage,
              description: `Action requires user approval: ${toolName}`,
              toolCalled: toolName,
              toolArgs,
              resultSummary: `Paused for approval (${approvalCheck.riskLevel} risk: ${approvalCheck.reason})`,
              success: false,
            });

            return task;
          }

          // Execute Tool
          const startTime = Date.now();
          let toolResult: any;
          let isSuccess = true;

          try {
            const TOOL_TIMEOUT_MS = 25000;
            toolResult = await Promise.race([
              executeTool(toolName, toolArgs, this.baseCwd),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`Tool "${toolName}" timed out after ${TOOL_TIMEOUT_MS}ms`)), TOOL_TIMEOUT_MS)
              ),
            ]);
            if (toolResult && toolResult.success === false) {
              isSuccess = false;
            }
          } catch (err: any) {
            isSuccess = false;
            toolResult = { error: err.message || String(err) };
          }

          const durationMs = Date.now() - startTime;
          const resultSummary = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult).slice(0, 300);

          TaskStore.addStep(this.taskId, {
            stage,
            description: `Tool execution: ${toolName}`,
            toolCalled: toolName,
            toolArgs,
            resultSummary,
            success: isSuccess,
            durationMs,
          });

          // Append tool result message back to LLM context
          messages.push({
            role: 'tool',
            name: toolName,
            toolCallId: call.id,
            content: JSON.stringify(toolResult),
          });

          // Check if git diff tool was called
          if (toolName === 'git_diff' && toolResult.stdout) {
            TaskStore.updateDiffs(this.taskId, [
              {
                filePath: 'modified_files',
                status: 'modified',
                additions: (toolResult.stdout.match(/^\+/gm) || []).length,
                deletions: (toolResult.stdout.match(/^-/gm) || []).length,
                diffContent: toolResult.stdout,
              },
            ]);
          }
        }
      }

      TaskStore.failTask(this.taskId, `Exceeded maximum agent iterations (${maxIterations}).`);
      return task;
    } catch (err: any) {
      TaskStore.failTask(this.taskId, err.message || String(err));
      return task;
    }
  }

  public async resumeAfterApproval(approved: boolean): Promise<AgentTask> {
    const task = TaskStore.getTask(this.taskId);
    if (!task) throw new Error(`Task ${this.taskId} not found`);

    TaskStore.resolveApproval(this.taskId, approved);

    if (approved) {
      return this.runTask();
    }
    return task;
  }
}
