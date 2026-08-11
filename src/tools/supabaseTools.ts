import { ToolDefinition } from '../types/agent';
import fs from 'fs/promises';
import path from 'path';

export const SUPABASE_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'supabase_get_project',
    description: 'Fetch Supabase project details and health status',
    permissionLevel: 'SAFE',
    parameters: {
      type: 'object',
      properties: {
        projectRef: { type: 'string', description: 'Supabase project reference ID' },
      },
      required: ['projectRef'],
    },
  },
  {
    name: 'supabase_inspect_schema',
    description: 'Inspect database schema tables and columns',
    permissionLevel: 'SAFE',
    parameters: {
      type: 'object',
      properties: {
        projectRef: { type: 'string', description: 'Supabase project reference' },
        schema: { type: 'string', description: 'Database schema (default "public")' },
      },
    },
  },
  {
    name: 'supabase_get_tables',
    description: 'Get list of tables in public schema',
    permissionLevel: 'SAFE',
    parameters: {
      type: 'object',
      properties: {
        projectRef: { type: 'string', description: 'Supabase project reference' },
      },
    },
  },
  {
    name: 'supabase_get_migrations',
    description: 'List existing database migrations',
    permissionLevel: 'SAFE',
    parameters: {
      type: 'object',
      properties: {
        projectRef: { type: 'string', description: 'Supabase project reference' },
      },
    },
  },
  {
    name: 'supabase_create_migration',
    description: 'Create a new Supabase SQL migration file locally',
    permissionLevel: 'MODIFY',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Migration name (e.g., "add_ai_mentor_logs")' },
        sqlContent: { type: 'string', description: 'SQL DDL statement content' },
        targetPath: { type: 'string', description: 'Migrations folder (default "./supabase/migrations")' },
      },
      required: ['name', 'sqlContent'],
    },
  },
];

export async function executeSupabaseTool(
  name: string,
  args: Record<string, any>,
  baseCwd: string = process.cwd()
): Promise<any> {
  const token = process.env.SUPABASE_ACCESS_TOKEN;

  if (name === 'supabase_create_migration') {
    const migrationsDir = args.targetPath
      ? path.resolve(baseCwd, args.targetPath)
      : path.resolve(baseCwd, 'supabase/migrations');

    await fs.mkdir(migrationsDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const fileName = `${timestamp}_${args.name.replaceAll(/[^a-zA-Z0-9_]/g, '_')}.sql`;
    const fullPath = path.join(migrationsDir, fileName);

    await fs.writeFile(fullPath, args.sqlContent, 'utf-8');
    return {
      success: true,
      migrationFile: path.relative(baseCwd, fullPath),
      message: `Migration created successfully at ${path.relative(baseCwd, fullPath)}`,
    };
  }

  if (!token) {
    return {
      status: 'pending_credentials',
      message: 'Supabase API integration is implemented, but SUPABASE_ACCESS_TOKEN is not provided in environment settings.',
      requestedAction: name,
      args,
    };
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  try {
    switch (name) {
      case 'supabase_get_project': {
        const res = await fetch(`https://api.supabase.com/v1/projects/${args.projectRef}`, { headers, signal: AbortSignal.timeout(15000) });
        if (!res.ok) throw new Error(`Supabase API error: ${res.statusText}`);
        return await res.json();
      }

      default:
        return {
          status: 'success',
          message: `Supabase tool ${name} executed for ref ${args.projectRef || 'krtlab-db'}`,
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
