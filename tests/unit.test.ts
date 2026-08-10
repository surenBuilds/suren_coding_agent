import { TerminalSecurity } from '../src/security/terminalSecurity';
import { PermissionManager } from '../src/security/permissions';
import { AgentRouter } from '../src/agent/router';
import { executeFileTool } from '../src/tools/fileTools';
import { executeTerminalTool } from '../src/tools/terminalTools';
import fs from 'fs/promises';
import path from 'path';

async function runUnitTests() {
  console.log('--- RUNNING SUREN CODING AGENT UNIT TESTS ---');

  // 1. Terminal Security & Secret Redaction
  console.log('[Test 1] Testing Terminal Security & Secret Redaction...');
  const dangerCheck = TerminalSecurity.isDangerousCommand('rm -rf /');
  if (!dangerCheck.isDangerous) {
    throw new Error('TerminalSecurity failed to detect dangerous command rm -rf /');
  }

  const secretInput = 'API Key AIzaSyD123456789012345678901234567890123 and token ghp_123456789012345678901234567890123456';
  const sanitized = TerminalSecurity.sanitizeOutput(secretInput);
  if (sanitized.includes('AIzaSyD123456789012345678901234567890123') || sanitized.includes('ghp_123456789012345678901234567890123456')) {
    throw new Error('TerminalSecurity failed to redact secrets!');
  }
  console.log('✓ Terminal Security passed.');

  // 2. Permission Levels
  console.log('[Test 2] Testing Permission Manager...');
  const readPerm = PermissionManager.getPermissionLevel('read_file');
  if (readPerm !== 'SAFE') throw new Error('read_file should be SAFE permission');

  const deletePerm = PermissionManager.getPermissionLevel('delete_file');
  if (deletePerm !== 'MODIFY') throw new Error('delete_file should be MODIFY permission');

  const deployPerm = PermissionManager.getPermissionLevel('vercel_deploy');
  if (deployPerm !== 'DEPLOY') throw new Error('vercel_deploy should be DEPLOY permission');
  console.log('✓ Permission Manager passed.');

  // 3. Router Project Detection
  console.log('[Test 3] Testing Natural Language Router...');
  const krtlabDetect = AgentRouter.detectProject('Please fix the AI Mentor persistence in KrtLab');
  if (krtlabDetect !== 'krtlab') throw new Error(`Expected krtlab detection, got ${krtlabDetect}`);

  const voxlineDetect = AgentRouter.detectProject('Check why Voxline voice synthesis is failing');
  if (voxlineDetect !== 'voxline') throw new Error(`Expected voxline detection, got ${voxlineDetect}`);

  const atlasDetect = AgentRouter.detectProject('Create ROS2 navigation node for Atlas');
  if (atlasDetect !== 'atlas') throw new Error(`Expected atlas detection, got ${atlasDetect}`);
  console.log('✓ Router detection passed.');

  // 4. File Tools
  console.log('[Test 4] Testing File Operations Tools...');
  const testDir = path.resolve(process.cwd(), 'projects/test_dir');
  await fs.mkdir(testDir, { recursive: true });
  const testFilePath = 'projects/test_dir/sample.txt';

  await executeFileTool('write_file', { filePath: testFilePath, content: 'Hello Suren Agent' });
  const readRes = await executeFileTool('read_file', { filePath: testFilePath });
  if (!readRes.content.includes('Hello Suren Agent')) {
    throw new Error('File Tool write/read verification failed');
  }

  await executeFileTool('patch_file', {
    filePath: testFilePath,
    targetContent: 'Hello Suren Agent',
    replacementContent: 'Hello Autonomous Agent',
  });
  const updatedRead = await executeFileTool('read_file', { filePath: testFilePath });
  if (!updatedRead.content.includes('Hello Autonomous Agent')) {
    throw new Error('File Tool patch verification failed');
  }

  await executeFileTool('delete_file', { filePath: testFilePath });
  console.log('✓ File Tools passed.');

  // 5. Terminal Tool Execution
  console.log('[Test 5] Testing Terminal Tool Execution...');
  const echoRes = await executeTerminalTool('run_command', { command: 'echo "Suren Agent Test"' });
  if (!echoRes.success || !echoRes.stdout.includes('Suren Agent Test')) {
    throw new Error('Terminal Tool execution failed');
  }
  console.log('✓ Terminal Tools passed.');

  console.log('=== ALL UNIT TESTS PASSED SUCCESSFULLY ===\n');
}

runUnitTests().catch((err) => {
  console.error('❌ Unit Tests Failed:', err);
  process.exit(1);
});
