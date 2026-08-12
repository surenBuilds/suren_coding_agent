import path from 'path';
import fs from 'fs/promises';
import { executeFileTool } from '../src/tools/fileTools';
import { executeTerminalTool } from '../src/tools/terminalTools';
import { safeResolve } from '../src/security/pathGuard';
import { ensureProjectWorkspace } from '../src/agent/projectWorkspace';
import { AgentRouter } from '../src/agent/router';

async function runPathResolutionTests() {
  console.log('--- RUNNING PROJECT-SCOPED PATH RESOLUTION TESTS ---');

  const projectsMap = await AgentRouter.loadProjects();
  const krtlab = projectsMap.get('krtlab');
  if (!krtlab) throw new Error('krtlab project not found in projects.json');

  // Ensure we have a real local checkout to test against (clones if missing).
  const projectRoot = await ensureProjectWorkspace(krtlab);
  console.log(`  Project checkout resolved to: ${projectRoot}`);

  // 1. read package.json -> projects/krtlab/package.json
  console.log('[Test 1] read package.json resolves inside project root...');
  const pkg = await executeFileTool('read_file', { filePath: 'package.json' }, projectRoot);
  const pkgResolved = safeResolve(projectRoot, 'package.json');
  if (!pkgResolved.startsWith(projectRoot)) {
    throw new Error('package.json did not resolve inside the project root');
  }
  if (!pkg.content || !pkg.content.toLowerCase().includes('name')) {
    throw new Error('package.json read did not return expected content');
  }
  console.log(`  ✓ Resolved to ${pkgResolved}`);

  // 2. read src/App.tsx -> projects/krtlab/src/App.tsx (or App.jsx/tsx variants — check dir instead if not present)
  console.log('[Test 2] read src file resolves inside project root...');
  const srcList = await executeFileTool('list_files', { dirPath: 'src' }, projectRoot);
  if (!srcList.files || srcList.files.length === 0) {
    throw new Error('Expected KrtLab src/ directory to contain files');
  }
  const firstSrcFile = srcList.files.find((f: string) => !f.endsWith('/'));
  if (firstSrcFile) {
    const fileRead = await executeFileTool('read_file', { filePath: firstSrcFile }, projectRoot);
    const expectedAbs = path.resolve(projectRoot, firstSrcFile);
    const actualAbs = safeResolve(projectRoot, firstSrcFile);
    if (actualAbs !== expectedAbs) {
      throw new Error(`Resolved path mismatch: ${actualAbs} !== ${expectedAbs}`);
    }
    if (!fileRead.content) throw new Error(`Failed to read ${firstSrcFile} from project root`);
  }
  console.log('  ✓ src files resolve inside project root');

  // 3. list src -> shows KrtLab's actual source tree, not the agent's own src/
  console.log('[Test 3] list src shows KrtLab source tree, not agent source tree...');
  const agentSrcList = await fs.readdir(path.resolve(process.cwd(), 'src'));
  const overlapsAgentSrc = srcList.files.some((f: string) => agentSrcList.includes(f.replace(/\/$/, '').split('/')[0]) && f.includes('agent'));
  // Weak check: ensure the listing is not literally the agent repo's own top-level src (which contains 'agent/', 'tools/', 'security/')
  const looksLikeAgentSrc = srcList.files.some((f: string) => f.startsWith('agent/') || f.startsWith('tools/') || f.startsWith('security/'));
  if (looksLikeAgentSrc) {
    throw new Error('list_files("src") returned the AGENT\'S OWN src/ tree instead of the project\'s — baseCwd leaked to workspace root');
  }
  console.log('  ✓ list_files correctly scoped to project checkout');

  // 4. write/edit a project file -> happens under project root
  console.log('[Test 4] write_file happens under project root...');
  const testRelPath = '__agent_path_test__.tmp';
  await executeFileTool('write_file', { filePath: testRelPath, content: 'path-scope-check' }, projectRoot);
  const writtenAbsPath = path.resolve(projectRoot, testRelPath);
  const onDisk = await fs.readFile(writtenAbsPath, 'utf-8');
  if (onDisk !== 'path-scope-check') throw new Error('write_file did not land inside the project root');
  await fs.unlink(writtenAbsPath);
  console.log('  ✓ write_file correctly scoped to project checkout');

  // 5. ../ traversal -> BLOCKED
  console.log('[Test 5] "../" traversal is blocked...');
  let blocked = false;
  try {
    await executeFileTool('read_file', { filePath: '../../etc/hostname' }, projectRoot);
  } catch {
    blocked = true;
  }
  if (!blocked) throw new Error('"../../etc/hostname" traversal was NOT blocked!');
  console.log('  ✓ Relative traversal blocked');

  // 6. absolute path outside project -> BLOCKED
  console.log('[Test 6] absolute path outside project root is blocked...');
  let absBlocked = false;
  try {
    await executeFileTool('read_file', { filePath: '/etc/hostname' }, projectRoot);
  } catch {
    absBlocked = true;
  }
  if (!absBlocked) throw new Error('Absolute path "/etc/hostname" was NOT blocked!');
  console.log('  ✓ Absolute-path escape blocked');

  // 6b. terminal tool cwd traversal -> BLOCKED
  console.log('[Test 6b] terminal tool cwd traversal is blocked...');
  let cwdBlocked = false;
  try {
    await executeTerminalTool('run_command', { command: 'pwd', cwd: '../../../' }, projectRoot);
  } catch {
    cwdBlocked = true;
  }
  if (!cwdBlocked) throw new Error('Terminal tool cwd traversal ("../../../") was NOT blocked!');
  console.log('  ✓ Terminal cwd traversal blocked');

  // 7. workspace-scoped operations continue to work (e.g. reading the agent's own files
  // when explicitly given the agent's own workspace root as baseCwd)
  console.log('[Test 7] workspace-scoped (agent-root) operations still work...');
  const agentPkg = await executeFileTool('read_file', { filePath: 'package.json' }, process.cwd());
  if (!agentPkg.content) throw new Error('Reading the agent\'s own package.json (workspace-scoped) broke');
  console.log('  ✓ Workspace-scoped operations unaffected');

  console.log('=== ALL PATH RESOLUTION TESTS PASSED SUCCESSFULLY ===\n');
}

runPathResolutionTests().catch((err) => {
  console.error('❌ Path Resolution Tests Failed:', err);
  process.exit(1);
});
