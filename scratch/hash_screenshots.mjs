import fs from 'fs';
import crypto from 'crypto';

const dir = 'C:/Users/nirwa/.gemini/antigravity/brain/9e483f03-1cf2-47e3-8f64-339345204cfb';
const files = fs.readdirSync(dir).filter(f => f.startsWith('shared_costs_') && f.endsWith('.png'));

for (const f of files) {
    const data = fs.readFileSync(`${dir}/${f}`);
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    console.log(`${f} | ${hash} | ${data.length} bytes`);
}
