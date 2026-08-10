import fs from 'fs/promises';
import path from 'path';

export class MemoryManager {
  public static async loadProjectMemory(memoryPath: string, baseCwd: string = process.cwd()): Promise<string> {
    const fullDir = path.isAbsolute(memoryPath) ? memoryPath : path.resolve(baseCwd, memoryPath);
    try {
      await fs.mkdir(fullDir, { recursive: true });
      const files = await fs.readdir(fullDir);
      const markdownFiles = files.filter((f) => f.endsWith('.md'));

      if (markdownFiles.length === 0) {
        return 'No memory documentation found for this project yet.';
      }

      const memoryDocs: string[] = [];
      for (const file of markdownFiles) {
        const filePath = path.join(fullDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        memoryDocs.push(`=== Memory Document: ${file} ===\n${content}\n`);
      }

      return memoryDocs.join('\n');
    } catch (err: any) {
      return `Memory directory unavailable: ${err.message}`;
    }
  }

  public static async updateProjectMemory(
    memoryPath: string,
    filename: string,
    content: string,
    baseCwd: string = process.cwd()
  ): Promise<boolean> {
    const fullDir = path.isAbsolute(memoryPath) ? memoryPath : path.resolve(baseCwd, memoryPath);
    try {
      await fs.mkdir(fullDir, { recursive: true });
      const targetFile = path.join(fullDir, filename.endsWith('.md') ? filename : `${filename}.md`);
      await fs.writeFile(targetFile, content, 'utf-8');
      return true;
    } catch {
      return false;
    }
  }
}
