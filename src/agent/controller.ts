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
      const systemInstruction = `You are "Suren Coding Agent", an autonomous senior software engineer working directly on Suren's real projects.
You are tasked with engineering project "${this.project.name}" (${this.project.stack.join(', ')}).

PROJECT MEMORY & ARCHITECTURE:
${memoryContent}

COMMAND CONFIGURATION:
Test Command: ${this.project.commands.test || 'npm test'}
Build Command: ${this.project.commands.build || 'npm run build'}
Lint Command: ${this.project.commands.lint || 'npm run lint'}

REQUEST TYPE — decide this first:
- If the user is asking a QUESTION (wants an explanation, status check, architecture review, opinion, or information) and no code/infra change is required, answer it directly and thoroughly. Use INSPECT-stage tools (read_file, list_files, search_code, github_get_*, vercel_get_*, railway_get_*) as needed to gather real facts before answering — never guess or fabricate. You do NOT need to go through PLAN -> MODIFY -> TEST -> COMMIT -> DEPLOY for a pure question.
- If the user is asking for a CHANGE (fix a bug, add a feature, deploy something, update config), run the full pipeline: UNDERSTAND -> INSPECT -> PLAN -> MODIFY -> TEST -> DIAGNOSE -> FIX -> VERIFY -> COMMIT -> DEPLOY, using only the stages that are actually relevant to the task.

TOOLS ACROSS YOUR CONNECTED SERVICES:
- GitHub tools (github_*) — inspect repos, files, code search, open PRs.
- Vercel tools (vercel_*) — inspect projects and deployments.
- Railway tools (railway_*) — inspect projects, deployments, deployment logs, and (with approval) set variables or redeploy.
Use whichever of these are relevant to answer accurately or complete the task — don't guess at infrastructure state when a tool can confirm it.

RULES:
1. Always inspect files, code, or live service state (via tools) before modifying or making claims about them.
2. Edit the minimum necessary set of files for change requests.
3. Test and build your changes to verify correctness before claiming success.
4. If a test or build fails, read the error output carefully, diagnose the root cause, and apply a fix.
5. Do NOT lie or claim an operation succeeded unless verified with a tool result.
6. Your FINAL answer (finalReport) must be exhaustive and self-contained: directly answer every part of what was asked, cite the specific facts/files/values you found, note any assumptions or things you could not verify, and suggest concrete next steps when relevant. Do not give a one-line answer to a multi-part question — the user should never need to ask a follow-up just to get the rest of the answer.
7. Keep intermediate tool calls minimal and purposeful — every tool call should be necessary to answer accurately or complete the task, since LLM requests are quota-limited.`;

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

          let finalReport = llmResponse.content;

          if (!finalReport || !finalReport.trim()) {
            // Model returned no text — force a dedicated final-answer turn with no tools available,
            // so it must respond in plain text instead of silently ending with nothing to say.
            const closingMessages: LLMMessage[] = [
              ...messages,
              {
                role: 'user',
                content:
                  'You have finished gathering information / making changes. Do not call any more tools. ' +
                  'Write your complete, exhaustive final answer now in plain text: directly address every part of the original request, ' +
                  'cite the concrete facts/files/values you found or changed, note any assumptions, and suggest next steps if relevant.',
              },
            ];
            try {
              const closingResponse = await this.provider.generate(closingMessages, undefined, {
                temperature: 0.1,
                systemInstruction,
              });
              finalReport = closingResponse.content;
            } catch {
              // If even this fails, fall through to the generic message below.
            }
          }

          finalReport = finalReport && finalReport.trim() ? finalReport : 'Task completed, but the model did not return a summary. Check the Activity tab for the raw steps taken.';
          TaskStore.completeTask(this.taskId, finalReport);
          return task;
        }

        // Execute Tool Calls
        for (const call of llmResponse.toolCalls) {
          const toolName = call.name;
          const toolArgs = call.args;

          // Determine stage mapping
          let stage: TaskStage = 'MODIFY';
          if (['list_files', 'read_file', 'search_code', 'github_get_file', 'railway_list_projects', 'railway_get_project', 'railway_get_deployments', 'railway_get_deployment_logs'].includes(toolName)) stage = 'INSPECT';
          if (['run_tests', 'run_build', 'run_lint'].includes(toolName)) stage = 'TEST';
          if (['git_commit', 'git_create_branch'].includes(toolName)) stage = 'COMMIT';
          if (['vercel_deploy', 'supabase_create_migration', 'railway_redeploy'].includes(toolName)) stage = 'DEPLOY';

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
