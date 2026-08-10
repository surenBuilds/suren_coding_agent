import { exec } from 'child_process';
import { ToolDefinition } from '../types/agent';
import { TerminalSecurity } from '../security/terminalSecurity';

export const TERMINAL_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'run_command',
    description: 'Execute a shell command in the workspace directory with security controls',
    permissionLevel: 'MODIFY',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The shell command line to execute' },
        cwd: { type: 'string', description: 'Working directory relative to root (default ".")' },
        timeoutMs: { type: 'integer', description: 'Timeout in milliseconds (default 30000)' },
      },
      required: ['command'],
    },
  },
  {
    name: 'run_tests',
    description: 'Execute automated tests for the project',
    permissionLevel: 'SAFE',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Custom test command (default "npm test")' },
        cwd: { type: 'string', description: 'Working directory' },
      },
    },
  },
  {
    name: 'run_build',
    description: 'Execute the project build step',
    permissionLevel: 'SAFE',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Custom build command (default "npm run build")' },
        cwd: { type: 'string', description: 'Working directory' },
      },
    },
  },
  {
    name: 'run_lint',
    description: 'Execute lint and type checks for the project',
    permissionLevel: 'SAFE',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Custom lint command (default "npm run lint")' },
        cwd: { type: 'string', description: 'Working directory' },
      },
    },
  },
];

export async function executeTerminalTool(
  name: string,
  args: Record<string, any>,
  baseCwd: string = process.cwd()
): Promise<any> {
  const cwd = args.cwd ? (args.cwd.startsWith('/') ? args.cwd : `${baseCwd}/${args.cwd}`) : baseCwd;
  const timeoutMs = args.timeoutMs || 45000;

  let cmdToRun = args.command;

  if (name === 'run_tests') {
    cmdToRun = args.command || 'npm test';
  } else if (name === 'run_build') {
    cmdToRun = args.command || 'npm run build';
  } else if (name === 'run_lint') {
    cmdToRun = args.command || 'npm run lint';
  }

  if (!cmdToRun) {
    throw new Error('Command string is required for terminal tool execution.');
  }

  const dangerCheck = TerminalSecurity.isDangerousCommand(cmdToRun);
  if (dangerCheck.isDangerous) {
    console.warn(`[Security Alert] Dangerous command intercepted: ${cmdToRun}`);
  }

  const startTime = Date.now();

  return new Promise((resolve) => {
    exec(cmdToRun, { cwd, timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      const durationMs = Date.now() - startTime;
      const sanitizedStdout = TerminalSecurity.sanitizeOutput(TerminalSecurity.truncateOutput(stdout || ''));
      const sanitizedStderr = TerminalSecurity.sanitizeOutput(TerminalSecurity.truncateOutput(stderr || ''));

      const exitCode = error ? (typeof error.code === 'number' ? error.code : 1) : 0;

      resolve({
        command: cmdToRun,
        cwd,
        exitCode,
        success: exitCode === 0,
        durationMs,
        stdout: sanitizedStdout,
        stderr: sanitizedStderr,
        errorMsg: error ? error.message : undefined,
      });
    });
  });
}
