import fs from 'fs/promises';
import path from 'path';
import { Project } from '../types/agent';

export interface RouteResult {
  isSlashCommand: boolean;
  commandName?: string;
  args?: string;
  projectId: string;
  cleanRequest: string;
}

export class AgentRouter {
  private static projectsCache: Map<string, Project> = new Map();

  public static async loadProjects(baseCwd: string = process.cwd()): Promise<Map<string, Project>> {
    const file = path.resolve(baseCwd, 'projects.json');
    try {
      const content = await fs.readFile(file, 'utf-8');
      const parsed = JSON.parse(content);
      this.projectsCache.clear();
      for (const [id, p] of Object.entries(parsed)) {
        this.projectsCache.set(id.toLowerCase(), p as Project);
      }
    } catch {
      // Default fallback
      this.projectsCache.set('krtlab', {
        id: 'krtlab',
        name: 'KrtLab',
        description: 'Educational ecosystem',
        localPath: './projects/krtlab',
        githubRepository: 'KrtLab/krtlab-app',
        defaultBranch: 'main',
        vercelProject: 'krtlab-web',
        supabaseProject: 'krtlab-db',
        stack: ['React', 'TypeScript', 'Vite', 'Tailwind', 'Supabase', 'Vercel'],
        commands: { test: 'npm test', build: 'npm run build', lint: 'npm run lint' },
        memoryPath: 'memory/krtlab/',
      });
    }
    return this.projectsCache;
  }

  public static async route(
    input: string,
    currentActiveProjectId: string = 'krtlab',
    baseCwd: string = process.cwd()
  ): Promise<RouteResult> {
    await this.loadProjects(baseCwd);
    const trimmed = input.trim();

    // Check slash commands
    if (trimmed.startsWith('/')) {
      const spaceIdx = trimmed.indexOf(' ');
      const cmd = spaceIdx === -1 ? trimmed.slice(1).toLowerCase() : trimmed.slice(1, spaceIdx).toLowerCase();
      const args = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1).trim();

      if (cmd === 'project' && args) {
        const matched = this.detectProject(args) || args.toLowerCase();
        return {
          isSlashCommand: true,
          commandName: 'project',
          args,
          projectId: matched,
          cleanRequest: `Switch to project ${matched}`,
        };
      }

      return {
        isSlashCommand: true,
        commandName: cmd,
        args,
        projectId: currentActiveProjectId,
        cleanRequest: args || cmd,
      };
    }

    // Natural Language Detection
    const detectedProject = this.detectProject(trimmed);
    const projectId = detectedProject || currentActiveProjectId;

    return {
      isSlashCommand: false,
      projectId,
      cleanRequest: trimmed,
    };
  }

  public static detectProject(text: string): string | null {
    const lower = text.toLowerCase();

    if (lower.includes('krtlab') || lower.includes('կրթլաբ') || lower.includes('mentor') || lower.includes('progress')) {
      return 'krtlab';
    }

    if (lower.includes('voxline') || lower.includes('voice') || lower.includes('speech')) {
      return 'voxline';
    }

    if (lower.includes('atlas') || lower.includes('robotics') || lower.includes('ros') || lower.includes('ros2')) {
      return 'atlas';
    }

    for (const [id, proj] of this.projectsCache.entries()) {
      if (lower.includes(id) || lower.includes(proj.name.toLowerCase())) {
        return id;
      }
    }

    return null;
  }
}
