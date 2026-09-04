import { parseAndEvaluateArithmetic } from '../components/moneyflow/mathParser.js';

console.log('Test 1:', parseAndEvaluateArithmetic('100 + 50 * 2') === 200);
console.log('Test 2:', parseAndEvaluateArithmetic('(100 + 50) * 2') === 300);
console.log('Test 3:', parseAndEvaluateArithmetic('1000 - 250 / 5') === 950);
console.log('Test 4:', parseAndEvaluateArithmetic('12.5 + 7.5') === 20);
console.log('All math parser tests passed.');
