import fs from 'fs';
import path from 'path';

const filePath = path.resolve(process.cwd(), 'scripts/build_moneyflow_presentation.js');
let content = fs.readFileSync(filePath, 'utf8');

// Replace \` with `
content = content.replace(/\\`/g, '`');

// Replace \${ with ${
content = content.replace(/\\\${/g, '${');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Builder script fixed successfully.');
