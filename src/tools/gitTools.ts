import { ToolDefinition } from '../types/agent';
import { executeTerminalTool } from './terminalTools';

export const GIT_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'git_status',
    description: 'Show working tree status',
    permissionLevel: 'SAFE',
    parameters: {
      type: 'object',
      properties: {
        cwd: { type: 'string', description: 'Working directory path' },
      },
    },
  },
  {
    name: 'git_diff',
    description: 'Show changes between commits, commit and working tree, etc.',
    permissionLevel: 'SAFE',
    parameters: {
      type: 'object',
      properties: {
        targetBranch: { type: 'string', description: 'Branch or commit to compare against (e.g. "main")' },
        cwd: { type: 'string', description: 'Working directory path' },
      },
    },
  },
  {
    name: 'git_log',
    description: 'Show recent commit log',
    permissionLevel: 'SAFE',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'integer', description: 'Number of commits to retrieve (default 10)' },
        cwd: { type: 'string', description: 'Working directory path' },
      },
    },
  },
  {
    name: 'git_branch',
    description: 'List local branches and current active branch',
    permissionLevel: 'SAFE',
    parameters: {
      type: 'object',
      properties: {
        cwd: { type: 'string', description: 'Working directory path' },
      },
    },
  },
  {
    name: 'git_create_branch',
    description: 'Create and checkout a new Git feature branch',
    permissionLevel: 'MODIFY',
    parameters: {
      type: 'object',
      properties: {
        branchName: { type: 'string', description: 'Name of feature branch to create' },
        cwd: { type: 'string', description: 'Working directory path' },
      },
      required: ['branchName'],
    },
  },
  {
    name: 'git_commit',
    description: 'Stage all modified files and commit with a structured message',
    permissionLevel: 'MODIFY',
    parameters: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Commit message' },
        cwd: { type: 'string', description: 'Working directory path' },
      },
      required: ['message'],
    },
  },
  {
    name: 'git_checkout',
    description: 'Switch branch or restore working tree files',
    permissionLevel: 'MODIFY',
    parameters: {
      type: 'object',
      properties: {
        branchName: { type: 'string', description: 'Branch or ref to checkout' },
        cwd: { type: 'string', description: 'Working directory path' },
      },
      required: ['branchName'],
    },
  },
];

export async function executeGitTool(
  name: string,
  args: Record<string, any>,
  baseCwd: string = process.cwd()
): Promise<any> {
  const cwd = args.cwd || baseCwd;

  switch (name) {
    case 'git_status': {
      return executeTerminalTool('run_command', { command: 'git status', cwd });
    }
    case 'git_diff': {
      const target = args.targetBranch ? ` ${args.targetBranch}` : '';
      return executeTerminalTool('run_command', { command: `git diff${target}`, cwd });
    }
    case 'git_log': {
      const limit = args.limit || 10;
      return executeTerminalTool('run_command', { command: `git log -n ${limit} --oneline`, cwd });
    }
    case 'git_branch': {
      return executeTerminalTool('run_command', { command: 'git branch -a', cwd });
    }
    case 'git_create_branch': {
      const branch = String(args.branchName).replaceAll(/[^a-zA-Z0-9_\-\/]/g, '');
      return executeTerminalTool('run_command', { command: `git checkout -b ${branch}`, cwd });
    }
    case 'git_commit': {
      const safeMsg = String(args.message).replaceAll('"', '\\"');
      const addRes = await executeTerminalTool('run_command', { command: 'git add -A', cwd });
      if (!addRes.success) return addRes;
      return executeTerminalTool('run_command', { command: `git commit -m "${safeMsg}"`, cwd });
    }
    case 'git_checkout': {
      const target = String(args.branchName);
      return executeTerminalTool('run_command', { command: `git checkout ${target}`, cwd });
    }
    default:
      throw new Error(`Unknown git tool: ${name}`);
  }
}
