// src/__tests__/calculator.test.js
const { add, subtract, multiply, divide } = require('../calculator');
describe('Calculator', () => {
 test('add : 2 + 3 doit retourner 5', () => {
 expect(add(2, 3)).toBe(5);
 });
 test('subtract : 10 - 4 doit retourner 6', () => {
 expect(subtract(10, 4)).toBe(6);
 });
 test('multiply : 3 * 4 doit retourner 12', () => {
 expect(multiply(3, 4)).toBe(12);
 });
 test('divide : 10 / 2 doit retourner 5', () => {
 expect(divide(10, 2)).toBe(5);
 });
 test('divide : division par zéro lève une erreur', () => {
 expect(() => divide(10, 0)).toThrow('Division par zéro impossible');
 });
 test('version Node.js', () => {
  // Using globalThis.process ensures absolutely no syntax or linting issues
  const version = globalThis.process.version; 
  const major = parseInt(version.slice(1));
  
  // This will pass on Node 18 (18 < 20) but fail on Node 20 (20 is not < 20)
  expect(major).toBeLessThan(20);
});
});
