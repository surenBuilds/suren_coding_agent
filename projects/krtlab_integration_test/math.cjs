// Intentional bug in calculation logic
function add(a, b) {
  return a + b; // BUG: Should be a + b
}

module.exports = { add };
