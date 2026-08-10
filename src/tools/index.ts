import { ToolDefinition } from '../types/agent';
import { FILE_TOOL_DEFINITIONS, executeFileTool } from './fileTools';
import { TERMINAL_TOOL_DEFINITIONS, executeTerminalTool } from './terminalTools';
import { GIT_TOOL_DEFINITIONS, executeGitTool } from './gitTools';
import { GITHUB_TOOL_DEFINITIONS, executeGitHubTool } from './githubTools';
import { VERCEL_TOOL_DEFINITIONS, executeVercelTool } from './vercelTools';
import { SUPABASE_TOOL_DEFINITIONS, executeSupabaseTool } from './supabaseTools';
import { BROWSER_TOOL_DEFINITIONS, executeBrowserTool } from './browserTools';

export const ALL_TOOLS: ToolDefinition[] = [
  ...FILE_TOOL_DEFINITIONS,
  ...TERMINAL_TOOL_DEFINITIONS,
  ...GIT_TOOL_DEFINITIONS,
  ...GITHUB_TOOL_DEFINITIONS,
  ...VERCEL_TOOL_DEFINITIONS,
  ...SUPABASE_TOOL_DEFINITIONS,
  ...BROWSER_TOOL_DEFINITIONS,
];

export async function executeTool(
  toolName: string,
  args: Record<string, any>,
  baseCwd: string = process.cwd()
): Promise<any> {
  const fileToolNames = new Set(FILE_TOOL_DEFINITIONS.map((t) => t.name));
  const terminalToolNames = new Set(TERMINAL_TOOL_DEFINITIONS.map((t) => t.name));
  const gitToolNames = new Set(GIT_TOOL_DEFINITIONS.map((t) => t.name));
  const githubToolNames = new Set(GITHUB_TOOL_DEFINITIONS.map((t) => t.name));
  const vercelToolNames = new Set(VERCEL_TOOL_DEFINITIONS.map((t) => t.name));
  const supabaseToolNames = new Set(SUPABASE_TOOL_DEFINITIONS.map((t) => t.name));
  const browserToolNames = new Set(BROWSER_TOOL_DEFINITIONS.map((t) => t.name));

  if (fileToolNames.has(toolName)) {
    return executeFileTool(toolName, args, baseCwd);
  }

  if (terminalToolNames.has(toolName)) {
    return executeTerminalTool(toolName, args, baseCwd);
  }

  if (gitToolNames.has(toolName)) {
    return executeGitTool(toolName, args, baseCwd);
  }

  if (githubToolNames.has(toolName)) {
    return executeGitHubTool(toolName, args);
  }

  if (vercelToolNames.has(toolName)) {
    return executeVercelTool(toolName, args);
  }

  if (supabaseToolNames.has(toolName)) {
    return executeSupabaseTool(toolName, args, baseCwd);
  }

  if (browserToolNames.has(toolName)) {
    return executeBrowserTool(toolName, args);
  }

  throw new Error(`Tool "${toolName}" is not registered in the Suren Coding Agent tool registry.`);
}
