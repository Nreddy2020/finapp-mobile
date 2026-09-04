/**
 * mathParser.js
 * 
 * SAFE FINANCIAL ARITHMETIC PARSER
 * Pure recursive-descent arithmetic evaluator supporting +, -, *, /, parenthesis, and decimals.
 * Zero dynamic code evaluation (zero eval, zero Function(...)).
 */

export function parseAndEvaluateArithmetic(expression) {
    if (!expression || typeof expression !== 'string') return 0;
    const sanitized = expression.replace(/,/g, '').trim();
    if (!sanitized) return 0;

    if (/[^0-9+\-*/().\s]/.test(sanitized)) {
        throw new Error('Invalid characters in arithmetic expression');
    }

    const tokens = [];
    let i = 0;
    while (i < sanitized.length) {
        const ch = sanitized[i];
        if (/\s/.test(ch)) {
            i++;
            continue;
        }
        if (/[0-9.]/.test(ch)) {
            let numStr = '';
            while (i < sanitized.length && /[0-9.]/.test(sanitized[i])) {
                numStr += sanitized[i];
                i++;
            }
            const num = parseFloat(numStr);
            if (isNaN(num)) throw new Error('Invalid number: ' + numStr);
            tokens.push({ type: 'NUMBER', value: num });
            continue;
        }
        if ('+-*/()'.includes(ch)) {
            tokens.push({ type: 'OP', value: ch });
            i++;
            continue;
        }
        throw new Error('Unexpected character: ' + ch);
    }

    if (tokens.length === 0) return 0;

    let pos = 0;
    function peek() {
        return tokens[pos];
    }
    function consume(expectedOp) {
        const t = tokens[pos];
        if (!t) throw new Error('Unexpected end of expression');
        if (expectedOp && (t.type !== 'OP' || t.value !== expectedOp)) {
            throw new Error('Expected ' + expectedOp + ', got ' + t.value);
        }
        pos++;
        return t;
    }

    function parseExpr() {
        let result = parseTerm();
        while (pos < tokens.length && peek().type === 'OP' && (peek().value === '+' || peek().value === '-')) {
            const op = consume().value;
            const nextTerm = parseTerm();
            if (op === '+') result += nextTerm;
            else result -= nextTerm;
        }
        return result;
    }

    function parseTerm() {
        let result = parseFactor();
        while (pos < tokens.length && peek().type === 'OP' && (peek().value === '*' || peek().value === '/')) {
            const op = consume().value;
            const nextFactor = parseFactor();
            if (op === '*') result *= nextFactor;
            else {
                if (nextFactor === 0) throw new Error('Division by zero');
                result /= nextFactor;
            }
        }
        return result;
    }

    function parseFactor() {
        const token = peek();
        if (!token) throw new Error('Unexpected end of expression');

        if (token.type === 'OP' && (token.value === '+' || token.value === '-')) {
            const sign = consume().value === '-' ? -1 : 1;
            return sign * parseFactor();
        }

        if (token.type === 'NUMBER') {
            consume();
            return token.value;
        }

        if (token.type === 'OP' && token.value === '(') {
            consume('(');
            const val = parseExpr();
            consume(')');
            return val;
        }

        throw new Error('Unexpected token: ' + token.value);
    }

    const result = parseExpr();
    if (pos < tokens.length) {
        throw new Error('Unparsed tokens remaining');
    }

    return Number.isFinite(result) ? result : 0;
}
