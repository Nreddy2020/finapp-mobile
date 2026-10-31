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
assert.ok(selfContent.includes("<MoneyFlowView"), "self.js must mount MoneyFlowView when activeTab === 'flow'");

// 4. Check MoneyFlowHeader component title rebranding
const headerPath = path.resolve(process.cwd(), 'components/moneyflow/presentation/MoneyFlowHeader.js');
const headerContent = fs.readFileSync(headerPath, 'utf8');
assert.ok(headerContent.includes("<Text style={mfStyles.headerTitle}>Money Flow</Text>"), "MoneyFlowHeader must render 'Money Flow' (not 'Personal Money Flow')");
assert.ok(!headerContent.includes("Personal Money Flow"), "MoneyFlowHeader must not contain 'Personal Money Flow'");

// 5. Check WhereDidMyCashGoSection inline breakdown and arrow
const wherePath = path.resolve(process.cwd(), 'components/moneyflow/presentation/WhereDidMyCashGoSection.js');
const whereContent = fs.readFileSync(wherePath, 'utf8');
assert.ok(whereContent.includes("expandedItemId"), "WhereDidMyCashGoSection must support expandable inline breakdown");
assert.ok(whereContent.includes("chevron-forward") || whereContent.includes("chevron-up"), "WhereDidMyCashGoSection must render arrow / chevron on category item");
assert.ok(!whereContent.includes("View full breakdown"), "WhereDidMyCashGoSection must have 'View full breakdown' removed");

console.log('✅ Self screen & Money Flow checks: Header rebranded to Money Flow, category breakdown expandable inline, View full breakdown removed');
console.log('\n🌟 ALL CHECKS PASSED: Money Flow is correctly wired and active!');
