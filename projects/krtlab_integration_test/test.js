const { add } = require('./math');
const result = add(5, 10);
if (result !== 15) {
  console.error('FAIL: Expected 15, got ' + result);
  process.exit(1);
} else {
  console.log('PASS: Calculation verified');
  process.exit(0);
}
