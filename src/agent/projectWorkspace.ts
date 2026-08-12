import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Project } from '../types/agent';

const execAsync = promisify(exec);

/**
 * Resolves the absolute local checkout path for a project and ensures it
 * actually exists on disk, cloning the project's GitHub repository into it
 * on first use if necessary (e.g. on a fresh container with no prior
 * checkout). This is what project-scoped tool baseCwd should be set to —
 * never process.cwd() (the agent's own workspace root).
 */
export async function ensureProjectWorkspace(project: Project, workspaceRoot: string = process.cwd()): Promise<string> {
  const localPath = path.resolve(workspaceRoot, project.localPath);

  let exists = false;
  let hasContent = false;
  try {
    const entries = await fs.readdir(localPath);
    exists = true;
    hasContent = entries.length > 0;
  } catch {
    exists = false;
  }

  if (exists && hasContent) {
    return localPath;
  }

  if (!project.githubRepository) {
    // No known source to clone from — create an empty dir so tools don't hard-crash on ENOENT.
    await fs.mkdir(localPath, { recursive: true });
    return localPath;
  }

  await fs.mkdir(path.dirname(localPath), { recursive: true });
  await fs.rm(localPath, { recursive: true, force: true });

  const token = process.env.GITHUB_TOKEN;
  const authPrefix = token ? `${token}@` : '';
  const cloneUrl = `https://${authPrefix}github.com/${project.githubRepository}.git`;
  const branch = project.defaultBranch || 'main';

  try {
    await execAsync(`git clone --depth 1 --branch ${branch} ${cloneUrl} ${JSON.stringify(localPath)}`, {
      timeout: 60000,
    });
  } catch (err: any) {
    // Surface a clean error without leaking the token in the message.
    const safeMessage = String(err.message || err).replaceAll(token || '###NOTOKEN###', '***');
    throw new Error(`Failed to clone project repository "${project.githubRepository}" into ${localPath}: ${safeMessage}`);
  }

  return localPath;
}
