import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { AgentController } from '../src/agent/controller';
import { TaskStore } from '../src/agent/taskStore';
import { Project } from '../src/types/agent';

const READONLY_AUDIT_PROMPT = `This is a READ-ONLY audit. Do not modify, write, or delete any files.
Inspect package.json and everything under src/.
Question: is Firebase an ACTIVE runtime dependency of this application, or is it LEGACY/UNUSED code that happens to be installed/configured but never actually imported and called anywhere reachable from the app?
Trace actual imports and call sites — do not conclude "active" just because firebase is in package.json or a firebase.ts config file exists.
State your classification (ACTIVE RUNTIME DEPENDENCY vs LEGACY/UNUSED) and your confidence level (CONFIRMED/LIKELY/POSSIBLE/UNKNOWN), citing exact file(s) and symbol(s) as evidence. Do not label this a P0 or critical issue unless you have CONFIRMED evidence of active runtime usage causing an actual conflict.`;

async function writeFixture(root: string, files: Record<string, string>) {
  for (const [rel, content] of Object.entries(files)) {
    const dest = path.join(root, rel);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, content, 'utf-8');
  }
}

function makeTestProject(id: string, localPath: string): Project {
  return {
    id,
    name: `Audit Evidence Fixture (${id})`,
    description: 'Synthetic fixture for evidence-based audit reasoning tests',
    localPath,
    githubRepository: '',
    defaultBranch: 'main',
    vercelProject: '',
    supabaseProject: '',
    stack: ['React', 'TypeScript'],
    commands: { test: 'echo "no tests"', build: 'echo "no build"', lint: 'echo "no lint"' },
    memoryPath: `memory/${id}/`,
  } as Project;
}

async function runAuditTask(project: Project): Promise<string> {
  const task = TaskStore.createTask(project.id, READONLY_AUDIT_PROMPT, 15);
  const controller = new AgentController(task.id, project, project.localPath, process.cwd());
  await controller.runTask();
  const finished = TaskStore.getTask(task.id);
  if (!finished) throw new Error('Task disappeared from TaskStore');
  if (finished.status === 'failed') {
    throw new Error(`Audit task failed: ${finished.error}`);
  }
  return finished.finalReport || '';
}

async function runAuditEvidenceTests() {
  console.log('--- RUNNING AUDIT EVIDENCE / CONFIDENCE TESTS ---');
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'audit-evidence-'));

  const sharedFirebaseConfig = `import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'test-key',
  authDomain: 'test.firebaseapp.com',
  projectId: 'test-project',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
`;

  const sharedPackageJson = JSON.stringify(
    {
      name: 'audit-fixture',
      version: '1.0.0',
      dependencies: { firebase: '^10.0.0', react: '^18.0.0' },
    },
    null,
    2
  );

  // --- FIXTURE A: firebase installed + configured, but NEVER imported/used anywhere else ---
  console.log('[Setup] Writing "legacy/unused Firebase" fixture...');
  const legacyRoot = path.join(tmpRoot, 'legacy-firebase');
  await writeFixture(legacyRoot, {
    'package.json': sharedPackageJson,
    'src/lib/firebase.ts': sharedFirebaseConfig,
    'src/App.tsx': `import React from 'react';

// This component never imports or references firebase.ts in any way.
export default function App() {
  return <div>Hello, world — no Firebase usage here.</div>;
}
`,
  });

  // --- FIXTURE B: firebase installed, configured, AND actually imported + called ---
  console.log('[Setup] Writing "active Firebase" fixture...');
  const activeRoot = path.join(tmpRoot, 'active-firebase');
  await writeFixture(activeRoot, {
    'package.json': sharedPackageJson,
    'src/lib/firebase.ts': sharedFirebaseConfig,
    'src/App.tsx': `import React from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './lib/firebase';

export default function App() {
  const handleLogin = () => {
    signInWithEmailAndPassword(auth, 'user@example.com', 'password123');
  };
  return <button onClick={handleLogin}>Log in with Firebase</button>;
}
`,
  });

  await TaskStore.init();

  console.log('[Test A] Auditing LEGACY/UNUSED Firebase fixture...');
  const legacyProject = makeTestProject('audit-fixture-legacy', legacyRoot);
  const legacyReport = await runAuditTask(legacyProject);
  console.log('--- Legacy fixture finalReport ---\n' + legacyReport + '\n---');

  const legacyLower = legacyReport.toLowerCase();
  const claimsUnused = legacyLower.includes('unused') || legacyLower.includes('legacy') || legacyLower.includes('not confirmed') || legacyLower.includes('no evidence');
  const falselyEscalates = /\bp0\b/.test(legacyLower) && !legacyLower.includes('not a p0') && !legacyLower.includes('not p0');
  if (!claimsUnused) {
    throw new Error('Legacy fixture: agent did not classify unused Firebase as legacy/unused/unconfirmed based on evidence.');
  }
  if (falselyEscalates) {
    throw new Error('Legacy fixture: agent incorrectly labeled unused Firebase as P0 without confirmed runtime evidence.');
  }
  console.log('  ✓ Correctly avoided false P0 / correctly flagged as unused or unconfirmed');

  console.log('[Test B] Auditing ACTIVE Firebase fixture...');
  const activeProject = makeTestProject('audit-fixture-active', activeRoot);
  const activeReport = await runAuditTask(activeProject);
  console.log('--- Active fixture finalReport ---\n' + activeReport + '\n---');

  const activeLower = activeReport.toLowerCase();
  const claimsActive = activeLower.includes('active') || activeLower.includes('confirmed');
  if (!claimsActive) {
    throw new Error('Active fixture: agent failed to recognize genuinely imported+called Firebase as an active/confirmed runtime dependency.');
  }
  console.log('  ✓ Correctly identified genuinely-used Firebase as active/confirmed');

  await fs.rm(tmpRoot, { recursive: true, force: true });
  console.log('=== ALL AUDIT EVIDENCE TESTS PASSED SUCCESSFULLY ===\n');
}

runAuditEvidenceTests().catch((err) => {
  console.error('❌ Audit Evidence Tests Failed:', err);
  process.exit(1);
});
