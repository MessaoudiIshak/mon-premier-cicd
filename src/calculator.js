// CORRECTION :
function add(a, b) {
 return a + b; // ← Correction : addition
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
var unused_variable = 'je ne suis jamais utilisée';
module.exports = { add, subtract, multiply, divide };
