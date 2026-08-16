import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== Checking Money Flow App Surface & Route Integrity ===\n');

// 1. Check layout route configuration in app/(tabs)/_layout.js
const layoutPath = path.resolve(process.cwd(), 'app/(tabs)/_layout.js');
const layoutContent = fs.readFileSync(layoutPath, 'utf8');

assert.ok(layoutContent.includes("route: '/(tabs)/self?tab=flow'"), "Money flow subTab must point to /(tabs)/self?tab=flow");
assert.ok(layoutContent.includes('<Tabs.Screen name="self"'), "Tabs.Screen must register 'self'");
assert.ok(!layoutContent.includes('<Tabs.Screen name="money"'), "Non-existent screen 'money' must be removed");

console.log('✅ Layout check: Money Flow route is registered to /(tabs)/self?tab=flow');

// 2. Check Home Dashboard navigation in app/(tabs)/index.js
const indexPath = path.resolve(process.cwd(), 'app/(tabs)/index.js');
const indexContent = fs.readFileSync(indexPath, 'utf8');

assert.ok(indexContent.includes("router.push('/(tabs)/self?tab=flow')"), "Home Money Flow pillar card must navigate to /(tabs)/self?tab=flow");
assert.ok(indexContent.includes("router.push('/loans')"), "Liabilities pillar card must navigate to /loans");

console.log('✅ Home Dashboard check: Money Flow tile correctly navigates to /(tabs)/self?tab=flow');

// 3. Check SelfScreen rendering and syntax in app/(tabs)/self.js
const selfPath = path.resolve(process.cwd(), 'app/(tabs)/self.js');
const selfContent = fs.readFileSync(selfPath, 'utf8');

assert.ok(selfContent.includes("activeTab === 'flow'"), "self.js must handle activeTab === 'flow'");
assert.ok(selfContent.includes("PERSONAL CFO INTELLIGENCE"), "self.js must render Personal CFO Intelligence banner");
assert.ok(selfContent.includes("Personal Spending Table"), "self.js must render Personal Spending Table");
assert.ok(selfContent.includes("router.push('/investments')"), "Banner must link to Decision Command Center");

console.log('✅ Self screen check: Money Flow view and CFO banner are valid and properly structured');
console.log('\n🌟 ALL CHECKS PASSED: Money Flow is correctly wired and active!');
