import { PermissionLevel, RiskLevel, ApprovalRequest } from '../types/agent';
import { TerminalSecurity } from './terminalSecurity';

export class PermissionManager {
  private static SAFE_TOOLS = new Set([
    'list_files',
    'read_file',
    'search_code',
    'git_status',
    'git_diff',
    'git_log',
    'git_branch',
    'run_tests',
    'run_build',
    'run_lint',
    'github_get_repository',
    'github_get_file',
    'github_search_code',
    'github_get_branch',
    'github_get_pull_request',
    'github_get_actions',
    'vercel_get_project',
    'vercel_get_deployments',
    'vercel_get_deployment',
    'vercel_get_logs',
    'supabase_get_project',
    'supabase_inspect_schema',
    'supabase_get_tables',
    'supabase_get_migrations',
    'open_url',
    'inspect_page',
    'screenshot',
    'browser_console',
  ]);

  private static MODIFY_TOOLS = new Set([
    'write_file',
    'patch_file',
    'delete_file',
    'run_command',
    'git_create_branch',
    'git_commit',
    'git_checkout',
    'github_create_branch',
    'github_commit',
    'github_create_pull_request',
    'supabase_create_migration',
  ]);

  private static DEPLOY_TOOLS = new Set([
    'vercel_deploy',
    'supabase_apply_migration',
    'github_merge_pull_request',
  ]);

  public static getPermissionLevel(toolName: string, args?: Record<string, any>): PermissionLevel {
    if (this.DEPLOY_TOOLS.has(toolName)) {
      return 'DEPLOY';
    }

    if (toolName === 'run_command' && args?.command) {
      const dangerCheck = TerminalSecurity.isDangerousCommand(args.command);
      if (dangerCheck.isDangerous) {
        return 'DEPLOY'; // Dangerous commands escalate to DEPLOY level requiring explicit approval
      }
    }

    if (toolName === 'delete_file') {
      return 'MODIFY';
    }

    if (this.MODIFY_TOOLS.has(toolName)) {
      return 'MODIFY';
    }

    return 'SAFE';
  }

  public static requiresApproval(
    toolName: string,
    args: Record<string, any>,
    autoApproveModify: boolean = true
  ): { requiresApproval: boolean; riskLevel: RiskLevel; reason: string } {
    const level = this.getPermissionLevel(toolName, args);

    if (level === 'SAFE') {
      return { requiresApproval: false, riskLevel: 'LOW', reason: 'Safe operation' };
    }

    if (level === 'DEPLOY') {
      return {
        requiresApproval: true,
        riskLevel: 'HIGH',
        reason: `Production / Destructive tool call: ${toolName}`,
      };
    }

    if (level === 'MODIFY') {
      // Check for dangerous sub-ops
      if (toolName === 'delete_file') {
        return {
          requiresApproval: !autoApproveModify,
          riskLevel: 'MEDIUM',
          reason: `File deletion requested: ${args.filePath || args.path}`,
        };
      }

      if (toolName === 'run_command' && args?.command) {
        const cmd = String(args.command);
        if (cmd.includes('npm install') || cmd.includes('yarn add') || cmd.includes('pip install')) {
          return {
            requiresApproval: false, // Dependency additions allowed during build/test loops unless specified
            riskLevel: 'LOW',
            reason: 'Installing dependencies',
          };
        }
      }

      return {
        requiresApproval: !autoApproveModify,
        riskLevel: 'MEDIUM',
        reason: `Code modification tool call: ${toolName}`,
      };
    }

    return { requiresApproval: false, riskLevel: 'LOW', reason: 'Allowed' };
  }

  public static createApprovalRequest(
    taskId: string,
    projectId: string,
    action: string,
    riskLevel: RiskLevel,
    reason: string,
    files?: string[],
    command?: string
  ): ApprovalRequest {
    return {
      id: `appr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      taskId,
      projectId,
      action,
      riskLevel,
      reason,
      files,
      command,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
  }
}
