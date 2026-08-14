import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Project } from '../types/agent';

const execAsync = promisify(exec);

async function gitBinaryAvailable(): Promise<boolean> {
  try {
    await execAsync('git --version', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

async function cloneViaGit(project: Project, localPath: string, token: string | undefined): Promise<void> {
  const authPrefix = token ? `${token}@` : '';
  const cloneUrl = `https://${authPrefix}github.com/${project.githubRepository}.git`;
  const branch = project.defaultBranch || 'main';
  await execAsync(`git clone --depth 1 --branch ${branch} ${cloneUrl} ${JSON.stringify(localPath)}`, {
    timeout: 60000,
  });
}

/**
 * Fallback for environments where the `git` CLI isn't available in the
 * runtime image (common for slim Node/Railpack production containers).
 * Fetches the repo tree via GitHub's REST API and writes each file
 * individually — no native binary dependency.
 */
async function cloneViaGitHubApi(project: Project, localPath: string, token: string | undefined): Promise<void> {
  const branch = project.defaultBranch || 'main';
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'Suren-Coding-Agent',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const treeRes = await fetch(
    `https://api.github.com/repos/${project.githubRepository}/git/trees/${branch}?recursive=1`,
    { headers, signal: AbortSignal.timeout(20000) }
  );
  if (!treeRes.ok) {
    throw new Error(`GitHub tree API error: ${treeRes.status} ${treeRes.statusText}`);
  }
  const treeData: any = await treeRes.json();
  const blobs: { path: string }[] = (treeData.tree || []).filter((n: any) => n.type === 'blob');

  if (blobs.length === 0) {
    throw new Error(`No files found in ${project.githubRepository}@${branch} via GitHub tree API`);
  }

  await fs.mkdir(localPath, { recursive: true });

  const CONCURRENCY = 4;
  const failures: string[] = [];
  let cursor = 0;
  async function worker() {
    while (cursor < blobs.length) {
      const idx = cursor++;
      const blob = blobs[idx];
      let ok = false;
      for (let attempt = 0; attempt < 2 && !ok; attempt++) {
        try {
          const contentRes = await fetch(
            `https://api.github.com/repos/${project.githubRepository}/contents/${encodeURIComponent(blob.path).replace(/%2F/g, '/')}?ref=${branch}`,
            { headers, signal: AbortSignal.timeout(20000) }
          );
          if (!contentRes.ok) {
            if (contentRes.status === 403 || contentRes.status === 429) {
              // Rate-limited — back off and retry once.
              await new Promise((r) => setTimeout(r, 2000));
              continue;
            }
            break; // non-retryable (e.g. 404 for a submodule) — record as failure below
          }
          const fileData: any = await contentRes.json();
          if (!fileData.content) break;
          const destPath = path.join(localPath, blob.path);
          await fs.mkdir(path.dirname(destPath), { recursive: true });
          await fs.writeFile(destPath, Buffer.from(fileData.content, fileData.encoding || 'base64'));
          ok = true;
        } catch {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
      if (!ok) failures.push(blob.path);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, blobs.length) }, worker));

  if (failures.length > 0) {
    throw new Error(
      `Incomplete checkout via GitHub API: failed to fetch ${failures.length}/${blobs.length} file(s) ` +
        `(likely GitHub API rate limiting — set/verify GITHUB_TOKEN). First failures: ${failures.slice(0, 5).join(', ')}`
    );
  }
}

/**
 * Resolves the absolute local checkout path for a project and ensures it
 * actually exists on disk, fetching the project's GitHub repository into it
 * on first use if necessary (e.g. on a fresh container with no prior
 * checkout). This is what project-scoped tool baseCwd should be set to —
 * never process.cwd() (the agent's own workspace root).
 */
export async function ensureProjectWorkspace(project: Project, workspaceRoot: string = process.cwd()): Promise<string> {
  const localPath = path.resolve(workspaceRoot, project.localPath);

  let hasContent = false;
  try {
    const entries = await fs.readdir(localPath);
    hasContent = entries.length > 0;
  } catch {
    hasContent = false;
  }

  if (hasContent) {
    return localPath;
  }

  if (!project.githubRepository) {
    await fs.mkdir(localPath, { recursive: true });
    return localPath;
  }

  await fs.mkdir(path.dirname(localPath), { recursive: true });
  await fs.rm(localPath, { recursive: true, force: true });

  const token = process.env.GITHUB_TOKEN;
  const useGit = await gitBinaryAvailable();

  try {
    if (useGit) {
      await cloneViaGit(project, localPath, token);
    } else {
      await cloneViaGitHubApi(project, localPath, token);
    }
  } catch (gitErr: any) {
    if (useGit) {
      try {
        await fs.rm(localPath, { recursive: true, force: true });
        await cloneViaGitHubApi(project, localPath, token);
        return localPath;
      } catch (apiErr: any) {
        await fs.rm(localPath, { recursive: true, force: true }).catch(() => {});
        const safeGit = String(gitErr.message || gitErr).replaceAll(token || '###NOTOKEN###', '***');
        const safeApi = String(apiErr.message || apiErr).replaceAll(token || '###NOTOKEN###', '***');
        throw new Error(
          `Failed to fetch project repository "${project.githubRepository}" into ${localPath}. ` +
            `git clone error: ${safeGit} | GitHub API fallback error: ${safeApi}`
        );
      }
    }
    await fs.rm(localPath, { recursive: true, force: true }).catch(() => {});
    const safeMessage = String(gitErr.message || gitErr).replaceAll(token || '###NOTOKEN###', '***');
    throw new Error(`Failed to fetch project repository "${project.githubRepository}" into ${localPath}: ${safeMessage}`);
  }

  return localPath;
}
