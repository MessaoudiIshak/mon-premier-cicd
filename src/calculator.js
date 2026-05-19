// CORRECTION :
function add(a, b) {
  if (a === ) { // <-- This is completely broken syntax! It will crash the linter instantly.
    return 0;
  }
  return a + b;
}

function subtract(a, b) {
 return a - b;
}
function multiply(a, b) {
 return a * b;
}
function divide(a, b) {
 if (b === 0) throw new Error('Division par zéro impossible');
 return a / b;
}

module.exports = { add, subtract, multiply, divide };
