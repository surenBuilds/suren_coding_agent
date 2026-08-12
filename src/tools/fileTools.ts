import fs from 'fs/promises';
import path from 'path';
import { ToolDefinition } from '../types/agent';
import { safeResolve } from '../security/pathGuard';

export const FILE_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'list_files',
    description: 'List files and subdirectories in a workspace path',
    permissionLevel: 'SAFE',
    parameters: {
      type: 'object',
      properties: {
        dirPath: { type: 'string', description: 'Directory path relative to workspace root (default ".")' },
        recursive: { type: 'boolean', description: 'Whether to list recursively' },
      },
    },
  },
  {
    name: 'read_file',
    description: 'Read the contents of a file in the workspace',
    permissionLevel: 'SAFE',
    parameters: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path to the file to read' },
        startLine: { type: 'integer', description: 'Optional 1-based start line' },
        endLine: { type: 'integer', description: 'Optional 1-based end line' },
      },
      required: ['filePath'],
    },
  },
  {
    name: 'write_file',
    description: 'Create or overwrite a file with specified content',
    permissionLevel: 'MODIFY',
    parameters: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Target file path' },
        content: { type: 'string', description: 'Full file content to write' },
      },
      required: ['filePath', 'content'],
    },
  },
  {
    name: 'patch_file',
    description: 'Surgically replace target exact text with replacement text in a file',
    permissionLevel: 'MODIFY',
    parameters: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Target file path' },
        targetContent: { type: 'string', description: 'Exact string to be replaced' },
        replacementContent: { type: 'string', description: 'New string to replace targetContent' },
      },
      required: ['filePath', 'targetContent', 'replacementContent'],
    },
  },
  {
    name: 'delete_file',
    description: 'Delete a file from the workspace',
    permissionLevel: 'MODIFY',
    parameters: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path of file to delete' },
      },
      required: ['filePath'],
    },
  },
  {
    name: 'search_code',
    description: 'Search for text or regex pattern across workspace source files',
    permissionLevel: 'SAFE',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query string or pattern' },
        dirPath: { type: 'string', description: 'Directory path to restrict search (default ".")' },
        extension: { type: 'string', description: 'File extension filter (e.g. ".ts")' },
      },
      required: ['query'],
    },
  },
];

export async function executeFileTool(name: string, args: Record<string, any>, baseCwd: string = process.cwd()): Promise<any> {
  const resolvePath = (p: string) => safeResolve(baseCwd, p || '.');

  switch (name) {
    case 'list_files': {
      const targetDir = resolvePath(args.dirPath || '.');
      const recursive = Boolean(args.recursive);

      async function scan(dir: string, depth: number = 0): Promise<string[]> {
        if (depth > 5) return [];
        const entries = await fs.readdir(dir, { withFileTypes: true });
        let files: string[] = [];

        for (const entry of entries) {
          if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
          const fullPath = path.join(dir, entry.name);
          const relPath = path.relative(baseCwd, fullPath);

          if (entry.isDirectory()) {
            files.push(`${relPath}/`);
            if (recursive) {
              files.push(...(await scan(fullPath, depth + 1)));
            }
          } else {
            files.push(relPath);
          }
        }
        return files;
      }

      const results = await scan(targetDir);
      return { total: results.length, files: results.slice(0, 100) };
    }

    case 'read_file': {
      const fullPath = resolvePath(args.filePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      const lines = content.split('\n');

      let start = args.startLine ? Math.max(1, args.startLine) - 1 : 0;
      let end = args.endLine ? Math.min(lines.length, args.endLine) : lines.length;

      const sliced = lines.slice(start, end);
      const numbered = sliced.map((line, idx) => `${start + idx + 1}: ${line}`).join('\n');

      return {
        filePath: args.filePath,
        totalLines: lines.length,
        showingLines: `${start + 1}-${end}`,
        content: numbered,
      };
    }

    case 'write_file': {
      const fullPath = resolvePath(args.filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, args.content, 'utf-8');
      return { success: true, filePath: args.filePath, bytesWritten: Buffer.byteLength(args.content, 'utf-8') };
    }

    case 'patch_file': {
      const fullPath = resolvePath(args.filePath);
      const content = await fs.readFile(fullPath, 'utf-8');

      if (!content.includes(args.targetContent)) {
        throw new Error(`Target content not found in ${args.filePath}. Ensure exact whitespace/line match.`);
      }

      const updated = content.replace(args.targetContent, args.replacementContent);
      await fs.writeFile(fullPath, updated, 'utf-8');
      return { success: true, filePath: args.filePath, message: 'Patch applied successfully' };
    }

    case 'delete_file': {
      const fullPath = resolvePath(args.filePath);
      await fs.unlink(fullPath);
      return { success: true, filePath: args.filePath };
    }

    case 'search_code': {
      const searchDir = resolvePath(args.dirPath || '.');
      const query = String(args.query).toLowerCase();
      const extension = args.extension ? String(args.extension) : null;
      const matches: { filePath: string; lineNumber: number; line: string }[] = [];

      async function searchDirRecursive(dir: string) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            await searchDirRecursive(fullPath);
          } else if (entry.isFile()) {
            if (extension && !entry.name.endsWith(extension)) continue;
            try {
              const fileContent = await fs.readFile(fullPath, 'utf-8');
              const lines = fileContent.split('\n');
              lines.forEach((line, idx) => {
                if (line.toLowerCase().includes(query)) {
                  matches.push({
                    filePath: path.relative(baseCwd, fullPath),
                    lineNumber: idx + 1,
                    line: line.trim(),
                  });
                }
              });
            } catch {
              // Ignore binary or non-utf8 files
            }
          }
        }
      }

      await searchDirRecursive(searchDir);
      return { query, totalMatches: matches.length, matches: matches.slice(0, 50) };
    }

    default:
      throw new Error(`Unknown file tool: ${name}`);
  }
}
