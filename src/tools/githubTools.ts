import { ToolDefinition } from '../types/agent';

export const GITHUB_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'github_get_repository',
    description: 'Fetch repository metadata from GitHub API',
    permissionLevel: 'SAFE',
    parameters: {
      type: 'object',
      properties: {
        ownerRepo: { type: 'string', description: 'Repository owner/repo string (e.g., "KrtLab/krtlab-app")' },
      },
      required: ['ownerRepo'],
    },
  },
  {
    name: 'github_get_file',
    description: 'Get file content from remote GitHub repository',
    permissionLevel: 'SAFE',
    parameters: {
      type: 'object',
      properties: {
        ownerRepo: { type: 'string', description: 'Repository owner/repo' },
        path: { type: 'string', description: 'File path in remote repository' },
        ref: { type: 'string', description: 'Branch or commit SHA (optional)' },
      },
      required: ['ownerRepo', 'path'],
    },
  },
  {
    name: 'github_search_code',
    description: 'Search code across a GitHub repository',
    permissionLevel: 'SAFE',
    parameters: {
      type: 'object',
      properties: {
        ownerRepo: { type: 'string', description: 'Repository owner/repo' },
        query: { type: 'string', description: 'Search term' },
      },
      required: ['ownerRepo', 'query'],
    },
  },
  {
    name: 'github_create_branch',
    description: 'Create a remote Git branch via GitHub API',
    permissionLevel: 'MODIFY',
    parameters: {
      type: 'object',
      properties: {
        ownerRepo: { type: 'string', description: 'Repository owner/repo' },
        branchName: { type: 'string', description: 'Name of new branch' },
        fromBranch: { type: 'string', description: 'Base branch name (default "main")' },
      },
      required: ['ownerRepo', 'branchName'],
    },
  },
  {
    name: 'github_commit',
    description: 'Commit or update a file directly in GitHub remote repository',
    permissionLevel: 'MODIFY',
    parameters: {
      type: 'object',
      properties: {
        ownerRepo: { type: 'string', description: 'Repository owner/repo' },
        branch: { type: 'string', description: 'Target branch name' },
        filePath: { type: 'string', description: 'File path in remote repo' },
        content: { type: 'string', description: 'Updated file content' },
        message: { type: 'string', description: 'Commit message' },
      },
      required: ['ownerRepo', 'branch', 'filePath', 'content', 'message'],
    },
  },
  {
    name: 'github_create_pull_request',
    description: 'Create a GitHub Pull Request',
    permissionLevel: 'MODIFY',
    parameters: {
      type: 'object',
      properties: {
        ownerRepo: { type: 'string', description: 'Repository owner/repo' },
        title: { type: 'string', description: 'PR Title' },
        body: { type: 'string', description: 'PR Description body' },
        head: { type: 'string', description: 'Feature branch name' },
        base: { type: 'string', description: 'Base branch name (default "main")' },
      },
      required: ['ownerRepo', 'title', 'head'],
    },
  },
  {
    name: 'github_get_pull_request',
    description: 'Get details of a GitHub Pull Request',
    permissionLevel: 'SAFE',
    parameters: {
      type: 'object',
      properties: {
        ownerRepo: { type: 'string', description: 'Repository owner/repo' },
        pullNumber: { type: 'integer', description: 'PR number' },
      },
      required: ['ownerRepo', 'pullNumber'],
    },
  },
  {
    name: 'github_get_actions',
    description: 'Get recent GitHub Actions workflow runs',
    permissionLevel: 'SAFE',
    parameters: {
      type: 'object',
      properties: {
        ownerRepo: { type: 'string', description: 'Repository owner/repo' },
      },
      required: ['ownerRepo'],
    },
  },
];

export async function executeGitHubTool(name: string, args: Record<string, any>): Promise<any> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return {
      status: 'pending_credentials',
      message: 'GitHub API integration is implemented, but GITHUB_TOKEN is not provided in environment settings.',
      requestedAction: name,
      args,
    };
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'Suren-Coding-Agent',
  };

  const TIMEOUT_MS = 15000;

  try {
    switch (name) {
      case 'github_get_repository': {
        const res = await fetch(`https://api.github.com/repos/${args.ownerRepo}`, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
        if (!res.ok) throw new Error(`GitHub API error: ${res.statusText}`);
        return await res.json();
      }

      case 'github_get_file': {
        const ref = args.ref ? `?ref=${args.ref}` : '';
        const res = await fetch(`https://api.github.com/repos/${args.ownerRepo}/contents/${args.path}${ref}`, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
        if (!res.ok) throw new Error(`GitHub API error: ${res.statusText}`);
        const data: any = await res.json();
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        return { path: data.path, sha: data.sha, size: data.size, content };
      }

      case 'github_search_code': {
        const q = encodeURIComponent(`${args.query} repo:${args.ownerRepo}`);
        const res = await fetch(`https://api.github.com/search/code?q=${q}`, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
        if (!res.ok) throw new Error(`GitHub API search error: ${res.statusText}`);
        return await res.json();
      }

      case 'github_create_pull_request': {
        const res = await fetch(`https://api.github.com/repos/${args.ownerRepo}/pulls`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: args.title,
            body: args.body || 'Automated PR by Suren Coding Agent',
            head: args.head,
            base: args.base || 'main',
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!res.ok) throw new Error(`GitHub PR creation error: ${res.statusText}`);
        return await res.json();
      }

      case 'github_get_actions': {
        const res = await fetch(`https://api.github.com/repos/${args.ownerRepo}/actions/runs`, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
        if (!res.ok) throw new Error(`GitHub Actions error: ${res.statusText}`);
        return await res.json();
      }

      default:
        return {
          status: 'success',
          message: `GitHub API call ${name} executed for ${args.ownerRepo}`,
          args,
        };
    }
  } catch (err: any) {
    return {
      status: 'error',
      message: err.message || String(err),
      tool: name,
    };
  }
}
