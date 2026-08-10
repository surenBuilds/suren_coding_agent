export type PermissionLevel = 'SAFE' | 'MODIFY' | 'DEPLOY';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TaskStage =
  | 'UNDERSTAND'
  | 'INSPECT'
  | 'PLAN'
  | 'MODIFY'
  | 'TEST'
  | 'DIAGNOSE'
  | 'FIX'
  | 'VERIFY'
  | 'COMMIT'
  | 'DEPLOY'
  | 'VERIFY_DEPLOYMENT';

export type TaskStatus =
  | 'idle'
  | 'running'
  | 'waiting_approval'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ProjectCommands {
  test?: string;
  build?: string;
  lint?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  localPath: string;
  githubRepository: string;
  defaultBranch: string;
  vercelProject: string;
  supabaseProject: string;
  stack: string[];
  commands: ProjectCommands;
  memoryPath: string;
}

export interface AgentStep {
  id: string;
  timestamp: string;
  stage: TaskStage;
  description: string;
  toolCalled?: string;
  toolArgs?: Record<string, any>;
  resultSummary?: string;
  success?: boolean;
  durationMs?: number;
}

export interface FileDiff {
  filePath: string;
  status: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
  diffContent: string;
}

export interface CommandLog {
  id: string;
  timestamp: string;
  command: string;
  cwd: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface ApprovalRequest {
  id: string;
  taskId: string;
  projectId: string;
  action: string;
  riskLevel: RiskLevel;
  reason: string;
  files?: string[];
  command?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  resolvedAt?: string;
}

export interface AgentTask {
  id: string;
  projectId: string;
  userRequest: string;
  startTime: string;
  endTime?: string;
  status: TaskStatus;
  currentStage: TaskStage;
  steps: AgentStep[];
  diffs: FileDiff[];
  commandsExecuted: CommandLog[];
  currentIteration: number;
  maxIterations: number;
  approvalRequired?: ApprovalRequest;
  planSummary?: string;
  finalReport?: string;
  error?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
}

export interface ToolResult {
  toolCallId: string;
  name: string;
  result: any;
  isError?: boolean;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  permissionLevel: PermissionLevel;
}

export interface LLMResponse {
  content: string;
  toolCalls?: ToolCall[];
  finishReason?: string;
}
