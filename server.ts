import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { createServer as createViteServer } from 'vite';
import { AgentRouter } from './src/agent/router';
import { TaskStore } from './src/agent/taskStore';
import { AgentController } from './src/agent/controller';
import { MemoryManager } from './src/memory/memoryManager';
import { Project } from './src/types/agent';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize TaskStore
  await TaskStore.init();

  // Load Projects
  let projectsMap = await AgentRouter.loadProjects();

  // ==================== REST API ENDPOINTS ====================

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      agent: 'Suren Coding Agent',
      version: '1.0.0',
      time: new Date().toISOString(),
    });
  });

  // Get all registered projects
  app.get('/api/projects', async (req, res) => {
    projectsMap = await AgentRouter.loadProjects();
    res.json(Array.from(projectsMap.values()));
  });

  // Add / update project
  app.post('/api/projects', async (req, res) => {
    try {
      const newProj: Project = req.body;
      if (!newProj.id || !newProj.name) {
        return res.status(400).json({ error: 'Project ID and Name are required' });
      }

      const projectsFile = path.resolve(process.cwd(), 'projects.json');
      let currentData: Record<string, any> = {};
      try {
        currentData = JSON.parse(await fs.readFile(projectsFile, 'utf-8'));
      } catch {
        // empty
      }

      currentData[newProj.id] = {
        ...newProj,
        commands: newProj.commands || { test: 'npm test', build: 'npm run build', lint: 'npm run lint' },
        memoryPath: newProj.memoryPath || `memory/${newProj.id}/`,
      };

      await fs.writeFile(projectsFile, JSON.stringify(currentData, null, 2), 'utf-8');
      projectsMap = await AgentRouter.loadProjects();

      res.json({ success: true, project: currentData[newProj.id] });
    } catch (err: any) {
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  // Get task history
  app.get('/api/tasks', (req, res) => {
    res.json(TaskStore.getAllTasks());
  });

  // Get task details
  app.get('/api/tasks/:id', (req, res) => {
    const task = TaskStore.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  });

  // Create & Start new Agent Task
  app.post('/api/tasks', async (req, res) => {
    try {
      const { prompt, projectId: reqProjectId } = req.body;
      if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

      // Route natural language / slash commands
      const routeResult = await AgentRouter.route(prompt, reqProjectId || 'krtlab');
      const targetProjectId = routeResult.projectId;

      projectsMap = await AgentRouter.loadProjects();
      const project = projectsMap.get(targetProjectId) || projectsMap.get('krtlab')!;

      // Handle Slash commands instant responses if purely informational
      if (routeResult.isSlashCommand) {
        const cmd = routeResult.commandName;
        if (cmd === 'status') {
          return res.json({
            status: 'info',
            message: `Agent status for ${project.name}: Active & Ready. Current stack: ${project.stack.join(', ')}.`,
          });
        }
      }

      // Create Task
      const configuredMaxIterations = parseInt(process.env.MAX_AGENT_ITERATIONS || '20', 10);
      const task = TaskStore.createTask(project.id, routeResult.cleanRequest, configuredMaxIterations);

      // Start Agent Controller asynchronously
      const controller = new AgentController(task.id, project);

      // Trigger execution in background
      controller.runTask().catch((err) => {
        console.error('[Agent Task Error]', err);
      });

      res.json({ success: true, taskId: task.id, projectId: project.id, task });
    } catch (err: any) {
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  // SSE Stream for Real-Time Agent Activity Events
  app.get('/api/tasks/:id/events', (req, res) => {
    const taskId = req.params.id;
    const task = TaskStore.getTask(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send initial task state
    res.write(`data: ${JSON.stringify({ type: 'INIT', task })}\n\n`);

    const unsubscribe = TaskStore.subscribe((updatedTask, step) => {
      if (updatedTask.id === taskId) {
        res.write(`data: ${JSON.stringify({ type: 'UPDATE', task: updatedTask, step })}\n\n`);
        if (updatedTask.status === 'completed' || updatedTask.status === 'failed') {
          res.write(`data: ${JSON.stringify({ type: 'END', task: updatedTask })}\n\n`);
        }
      }
    });

    req.on('close', () => {
      unsubscribe();
    });
  });

  // Approve high-risk task action
  app.post('/api/tasks/:id/approve', async (req, res) => {
    try {
      const taskId = req.params.id;
      const { approved } = req.body;

      const task = TaskStore.getTask(taskId);
      if (!task) return res.status(404).json({ error: 'Task not found' });

      projectsMap = await AgentRouter.loadProjects();
      const project = projectsMap.get(task.projectId) || projectsMap.get('krtlab')!;

      const controller = new AgentController(taskId, project);
      controller.resumeAfterApproval(Boolean(approved)).catch((err) => {
        console.error('[Resume Error]', err);
      });

      res.json({ success: true, taskId, approved });
    } catch (err: any) {
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  // Get project memory
  app.get('/api/memory/:projectId', async (req, res) => {
    projectsMap = await AgentRouter.loadProjects();
    const proj = projectsMap.get(req.params.projectId);
    if (!proj) return res.status(404).json({ error: 'Project not found' });

    const memoryText = await MemoryManager.loadProjectMemory(proj.memoryPath);
    res.json({ projectId: proj.id, memory: memoryText });
  });

  // Update project memory
  app.post('/api/memory/:projectId', async (req, res) => {
    try {
      const { filename, content } = req.body;
      projectsMap = await AgentRouter.loadProjects();
      const proj = projectsMap.get(req.params.projectId);
      if (!proj) return res.status(404).json({ error: 'Project not found' });

      const ok = await MemoryManager.updateProjectMemory(proj.memoryPath, filename, content);
      res.json({ success: ok });
    } catch (err: any) {
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  // ==================== VITE MIDDLEWARE / SERVING ====================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Suren Coding Agent Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
