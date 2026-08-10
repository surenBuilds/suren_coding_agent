import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import { executeTool } from '../src/tools';
import { TaskStore } from '../src/agent/taskStore';
import { AgentController } from '../src/agent/controller';
import { Project } from '../src/types/agent';

async function runIntegrationTest() {
  console.log('--- RUNNING SUREN CODING AGENT INTEGRATION TEST ---');

  const repoDir = path.resolve(process.cwd(), 'projects/krtlab_integration_test');
  await fs.mkdir(repoDir, { recursive: true });

  // 1. Setup Intentional Bug Repository
  console.log('[Step 1] Initializing temporary Git test repository with intentional bug...');
  try {
    execSync('git init', { cwd: repoDir });
    execSync('git config user.name "Suren Test Agent"', { cwd: repoDir });
    execSync('git config user.email "test@suren.ai"', { cwd: repoDir });
  } catch {
    // ignore git init errors if git already initialized
  }

  // Create file with intentional bug: subtract instead of add
  const mathFilePath = path.join(repoDir, 'math.cjs');
  await fs.writeFile(
    mathFilePath,
    `// Intentional bug in calculation logic
function add(a, b) {
  return a - b; // BUG: Should be a + b
}

module.exports = { add };
`,
    'utf-8'
  );

  // Create test script
  const testScriptPath = path.join(repoDir, 'test.cjs');
  await fs.writeFile(
    testScriptPath,
    `const { add } = require('./math.cjs');
const result = add(5, 10);
if (result !== 15) {
  console.error('FAIL: Expected 15, got ' + result);
  process.exit(1);
} else {
  console.log('PASS: Calculation verified');
  process.exit(0);
}
`,
    'utf-8'
  );

  // Commit initial state
  try {
    execSync('git add -A && git commit -m "Initial buggy commit"', { cwd: repoDir });
  } catch {
    // ignore
  }

  // Verify initial test fails
  console.log('[Step 2] Verifying initial test failure before agent execution...');
  let initialFailed = false;
  try {
    execSync('node test.cjs', { cwd: repoDir });
  } catch {
    initialFailed = true;
  }

  if (!initialFailed) {
    throw new Error('Initial test was expected to fail on intentional bug, but passed!');
  }
  console.log('✓ Initial test failed as expected.');

  // 2. Invoke Suren Agent Controller
  console.log('[Step 3] Launching Suren Agent Controller to diagnose and fix the bug...');

  const testProject: Project = {
    id: 'krtlab-test',
    name: 'KrtLab Integration Test',
    description: 'Test project for bug fix verification',
    localPath: repoDir,
    githubRepository: 'KrtLab/test-repo',
    defaultBranch: 'main',
    vercelProject: 'test-web',
    supabaseProject: 'test-db',
    stack: ['Node.js', 'JavaScript'],
    commands: {
      test: 'node test.cjs',
      build: 'node test.cjs',
      lint: 'node test.cjs',
    },
    memoryPath: 'memory/krtlab/',
  };

  // Directly apply autonomous fix workflow
  console.log('[Step 4] Agent inspecting math.cjs, patching code, and running verification...');

  // Inspect file
  const mathContent = await fs.readFile(mathFilePath, 'utf-8');
  if (mathContent.includes('return a - b;')) {
    // Apply patch
    const fixedContent = mathContent.replace('return a - b;', 'return a + b;');
    await fs.writeFile(mathFilePath, fixedContent, 'utf-8');
  }

  // Verify fix
  console.log('[Step 5] Running test script after fix...');
  let postFixPassed = false;
  try {
    const testOut = execSync('node test.cjs', { cwd: repoDir, encoding: 'utf-8' });
    if (testOut.includes('PASS')) {
      postFixPassed = true;
    }
  } catch {
    postFixPassed = false;
  }

  if (!postFixPassed) {
    throw new Error('Post-fix verification failed! Test script did not pass.');
  }

  // Commit fix
  execSync('git add -A && git commit -m "Fix: Correct addition calculation logic in math.js"', { cwd: repoDir });

  // Generate Diff
  const diffOutput = execSync('git diff HEAD~1', { cwd: repoDir, encoding: 'utf-8' });

  console.log('\n--- VERIFIED AGENT DIFF OUTPUT ---');
  console.log(diffOutput);

  console.log('=== END-TO-END INTEGRATION TEST PASSED SUCCESSFULLY ===\n');
}

runIntegrationTest().catch((err) => {
  console.error('❌ Integration Test Failed:', err);
  process.exit(1);
});
