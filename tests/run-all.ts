import { execSync } from 'child_process';

console.log('==================================================');
console.log('SUREN CODING AGENT - COMPREHENSIVE TEST RUNNER');
console.log('==================================================\n');

try {
  console.log('>>> RUNNING UNIT TESTS...');
  execSync('npx tsx tests/unit.test.ts', { stdio: 'inherit' });

  console.log('>>> RUNNING PATH RESOLUTION TESTS...');
  execSync('npx tsx tests/pathResolution.test.ts', { stdio: 'inherit' });

  console.log('>>> RUNNING AUDIT EVIDENCE TESTS...');
  execSync('npx tsx tests/auditEvidence.test.ts', { stdio: 'inherit' });

  console.log('>>> RUNNING INTEGRATION TESTS...');
  execSync('npx tsx tests/integration.test.ts', { stdio: 'inherit' });

  console.log('\n==================================================');
  console.log('✅ ALL AGENT TESTS PASSED SUCCESSFULLY!');
  console.log('==================================================');
} catch (err) {
  console.error('\n❌ TEST RUNNER FAILED!');
  process.exit(1);
}
