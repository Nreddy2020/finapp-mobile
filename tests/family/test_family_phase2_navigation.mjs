/**
 * tests/family/test_family_phase2_navigation.mjs
 * 
 * FinLife Family Operating System Phase 2 Navigation & Route Structure Test Suite.
 * 
 * Verifies all 27 Phase 2 Navigation Invariants:
 * - Tab derivation & Expo Router sync (NAV-P2-01 to 06)
 * - Tab definitions & route integrity (NAV-P2-07 to 09)
 * - Household context banner states & formatting (NAV-P2-10 to 17)
 * - Caller-preserving back navigation semantics (NAV-P2-18 to 20)
 * - Entry-point redirect & route collision invariants (NAV-P2-21 to 23)
 * - Honest scaffold & zero domain leakage invariants (NAV-P2-24 to 27)
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

import {
    FAMILY_TABS,
    getActiveTabFromPathname,
    resolveHouseholdBannerState,
    resolveBackNavigationAction,
    resolveGlobalHomeNavigationAction,
    FINLIFE_HOME_ROUTE,
    getTabDisplayMetadata
} from '../../components/family/navigation/navigationHelpers.js';

console.log('================================================================');
console.log('🧭 EXECUTING FINLIFE FAMILY OS PHASE 2 NAVIGATION TEST SUITE');
console.log('   Scope: Route Structure, Top Tabs, Context Banner & Scaffolds');
console.log('================================================================\n');

let passCount = 0;
let totalCount = 0;

function check(id, name, fn) {
    totalCount++;
    try {
        fn();
        passCount++;
        console.log(`  [PASS] ${id}: ${name}`);
    } catch (err) {
        console.error(`  [FAIL] ${id}: ${name}`);
        console.error(`         Error: ${err.message}`);
        throw err;
    }
}

// -----------------------------------------------------------------------------
// Category 1: Tab Derivation & Expo Router Sync (NAV-P2-01 to 06)
// -----------------------------------------------------------------------------

check('NAV-P2-01', 'Root path mapping: /family and /family/ map strictly to home tab', () => {
    assert.strictEqual(getActiveTabFromPathname('/family'), 'home');
    assert.strictEqual(getActiveTabFromPathname('/family/'), 'home');
});

check('NAV-P2-02', 'People tab mapping: /family/people and subroutes map strictly to people tab', () => {
    assert.strictEqual(getActiveTabFromPathname('/family/people'), 'people');
    assert.strictEqual(getActiveTabFromPathname('/family/people/'), 'people');
    assert.strictEqual(getActiveTabFromPathname('/family/people/detail-123'), 'people');
});

check('NAV-P2-03', 'Operations tab mapping: /family/operations and subroutes map strictly to operations tab', () => {
    assert.strictEqual(getActiveTabFromPathname('/family/operations'), 'operations');
    assert.strictEqual(getActiveTabFromPathname('/family/operations/tasks'), 'operations');
});

check('NAV-P2-04', 'Protection tab mapping: /family/protection and subroutes map strictly to protection tab', () => {
    assert.strictEqual(getActiveTabFromPathname('/family/protection'), 'protection');
    assert.strictEqual(getActiveTabFromPathname('/family/protection/insurance'), 'protection');
});

check('NAV-P2-05', 'More hub & secondary gateways mapping: /family/more and subroutes map strictly to more tab', () => {
    assert.strictEqual(getActiveTabFromPathname('/family/more'), 'more');
    assert.strictEqual(getActiveTabFromPathname('/family/more/resources'), 'more');
    assert.strictEqual(getActiveTabFromPathname('/family/more/financials'), 'more');
    assert.strictEqual(getActiveTabFromPathname('/family/more/readiness'), 'more');
});

check('NAV-P2-06', 'Unknown, falsy, or malformed route inputs safely default to home tab without throwing', () => {
    assert.strictEqual(getActiveTabFromPathname(null), 'home');
    assert.strictEqual(getActiveTabFromPathname(undefined), 'home');
    assert.strictEqual(getActiveTabFromPathname(''), 'home');
    assert.strictEqual(getActiveTabFromPathname('/random/unknown'), 'home');
});

// -----------------------------------------------------------------------------
// Category 2: Tab Definitions & Route Integrity (NAV-P2-07 to 09)
// -----------------------------------------------------------------------------

check('NAV-P2-07', 'FAMILY_TABS contains exactly 5 top tabs with authoritative order', () => {
    assert.strictEqual(FAMILY_TABS.length, 5);
    const ids = FAMILY_TABS.map(t => t.id);
    assert.deepStrictEqual(ids, ['home', 'people', 'operations', 'protection', 'more']);
});

check('NAV-P2-08', 'FAMILY_TABS routes strictly align with Expo Router paths', () => {
    const expectedRoutes = [
        '/family',
        '/family/people',
        '/family/operations',
        '/family/protection',
        '/family/more'
    ];
    const actualRoutes = FAMILY_TABS.map(t => t.route);
    assert.deepStrictEqual(actualRoutes, expectedRoutes);
});

check('NAV-P2-09', 'FAMILY_TABS display labels match UI specifications exactly', () => {
    const expectedLabels = ['Home', 'People', 'Operations', 'Protection', 'More'];
    const actualLabels = FAMILY_TABS.map(t => t.label);
    assert.deepStrictEqual(actualLabels, expectedLabels);
});

// -----------------------------------------------------------------------------
// Category 3: Household Context Banner States & Formatting (NAV-P2-10 to 17)
// -----------------------------------------------------------------------------

check('NAV-P2-10', 'resolveHouseholdBannerState returns NO_HOUSEHOLD when input is null, undefined, or missing id', () => {
    const nullState = resolveHouseholdBannerState(null);
    assert.strictEqual(nullState.type, 'NO_HOUSEHOLD');
    assert.strictEqual(nullState.title, 'No Household Configured');
    assert.strictEqual(nullState.badgeText, 'Not Configured');

    const undefinedState = resolveHouseholdBannerState(undefined);
    assert.strictEqual(undefinedState.type, 'NO_HOUSEHOLD');

    const emptyObjState = resolveHouseholdBannerState({});
    assert.strictEqual(emptyObjState.type, 'NO_HOUSEHOLD');
});

check('NAV-P2-11', 'resolveHouseholdBannerState returns neutral gray styling for NO_HOUSEHOLD state', () => {
    const state = resolveHouseholdBannerState(null);
    assert.strictEqual(state.badgeColor, '#71717A');
    assert.strictEqual(state.badgeBg, '#71717A20');
    assert.strictEqual(state.description, 'Set up a family household to get started');
});

check('NAV-P2-12', 'resolveHouseholdBannerState returns ACTIVE with emerald green styling for confirmed household', () => {
    const household = {
        id: 'hh-1',
        name: 'Sharma Household',
        status: 'ACTIVE',
        activeMemberIds: ['p-1', 'p-2']
    };
    const state = resolveHouseholdBannerState(household);
    assert.strictEqual(state.type, 'ACTIVE');
    assert.strictEqual(state.title, 'Sharma Household');
    assert.strictEqual(state.badgeText, 'Active');
    assert.strictEqual(state.badgeColor, '#10B981');
    assert.strictEqual(state.badgeBg, '#10B98120');
});

check('NAV-P2-13', 'resolveHouseholdBannerState derives member count dynamically from activeMemberIds array', () => {
    const household = {
        id: 'hh-2',
        name: 'Patel Family',
        status: 'ACTIVE',
        activeMemberIds: ['p-1', 'p-2', 'p-3', 'p-4']
    };
    const state = resolveHouseholdBannerState(household);
    assert.strictEqual(state.description, '4 Confirmed Members');
});

check('NAV-P2-14', 'Grammar agreement in banner: singular for 1 member vs plural for N members', () => {
    const singleMember = {
        id: 'hh-3',
        name: 'Single Resident',
        status: 'ACTIVE',
        activeMemberIds: ['p-1']
    };
    const state1 = resolveHouseholdBannerState(singleMember);
    assert.strictEqual(state1.description, '1 Confirmed Member');

    const zeroMembers = {
        id: 'hh-4',
        name: 'Vacant Household',
        status: 'ACTIVE',
        activeMemberIds: []
    };
    const state0 = resolveHouseholdBannerState(zeroMembers);
    assert.strictEqual(state0.description, '0 Confirmed Members');
});

check('NAV-P2-15', 'PROVISIONAL household banner reports strictly 0 confirmed members and pending review count', () => {
    const provisionalHousehold = {
        id: 'hh-prov',
        name: 'Imported Legacy Household',
        status: 'PROVISIONAL',
        activeMemberIds: [],
        provisionalMemberIds: ['p-1', 'p-2', 'p-3']
    };
    const state = resolveHouseholdBannerState(provisionalHousehold);
    assert.strictEqual(state.type, 'PROVISIONAL');
    assert.strictEqual(state.badgeText, 'Provisional');
    assert.strictEqual(state.badgeColor, '#F59E0B');
    assert.strictEqual(state.description, '0 Confirmed Members • 3 Pending Review');
});

check('NAV-P2-16', 'UNAVAILABLE banner state is returned on error with crimson warning styling', () => {
    const state = resolveHouseholdBannerState(null, new Error('Storage read timeout'));
    assert.strictEqual(state.type, 'UNAVAILABLE');
    assert.strictEqual(state.title, 'Household Information Unavailable');
    assert.strictEqual(state.badgeText, 'Unavailable');
    assert.strictEqual(state.badgeColor, '#EF4444');
    assert.strictEqual(state.badgeBg, '#EF444420');
    assert.strictEqual(state.description, 'Unable to load family household status');
});

check('NAV-P2-17', 'Banner never falls back to hardcoded sample names or fake metric counts', () => {
    const household = {
        id: 'hh-real',
        name: 'Reddy Household',
        status: 'ACTIVE',
        activeMemberIds: ['p-10', 'p-20']
    };
    const state = resolveHouseholdBannerState(household);
    assert.doesNotMatch(state.title, /Smith Family/i);
    assert.strictEqual(state.title, 'Reddy Household');
    assert.strictEqual(state.description, '2 Confirmed Members');
});

// -----------------------------------------------------------------------------
// Category 4: Caller-Preserving Back Navigation Semantics (NAV-P2-18 to 20)
// -----------------------------------------------------------------------------

check('NAV-P2-18', 'resolveBackNavigationAction returns back action when canGoBack is true', () => {
    const decision = resolveBackNavigationAction(true);
    assert.deepStrictEqual(decision, { action: 'back' });
});

check('NAV-P2-19', 'resolveBackNavigationAction returns replace /family when canGoBack is false', () => {
    const decision = resolveBackNavigationAction(false);
    assert.deepStrictEqual(decision, { action: 'replace', route: '/family' });
});

check('NAV-P2-20', 'Custom fallback route is strictly honored when stack cannot go back', () => {
    const decision = resolveBackNavigationAction(false, '/custom-caller');
    assert.deepStrictEqual(decision, { action: 'replace', route: '/custom-caller' });
});

// -----------------------------------------------------------------------------
// Category 5: Entry-Point Redirect & Route Collision Invariants (NAV-P2-21 to 23)
// -----------------------------------------------------------------------------

check('NAV-P2-21', 'Entry-point redirect invariant: app/(tabs)/family.js exists and contains declarative Redirect', () => {
    const entryPath = path.resolve(process.cwd(), 'app/(tabs)/family.js');
    assert.strictEqual(fs.existsSync(entryPath), true, 'app/(tabs)/family.js must exist');
    const content = fs.readFileSync(entryPath, 'utf8');
    assert.match(content, /<Redirect\s+href="\/family"\s*\/>/, 'Must declaratively redirect to /family');
});

check('NAV-P2-22', 'Route collision avoidance: No colliding file app/family.js exists in workspace', () => {
    const collidingFile = path.resolve(process.cwd(), 'app/family.js');
    assert.strictEqual(fs.existsSync(collidingFile), false, 'app/family.js must NOT exist to avoid collision with app/family/');
});

check('NAV-P2-23', 'Expo Router architecture: No local catch-all app/family/[...unmatched].js route exists', () => {
    const unmatchedFile = path.resolve(process.cwd(), 'app/family/[...unmatched].js');
    assert.strictEqual(fs.existsSync(unmatchedFile), false, 'app/family/[...unmatched].js must NOT exist');
});

// -----------------------------------------------------------------------------
// Category 6: Honest Scaffolds & Zero Domain Leakage Invariants (NAV-P2-24 to 27)
// -----------------------------------------------------------------------------

check('NAV-P2-24', 'Scaffolding honesty: app/family/more/resources.js is a placeholder for Phase 3 Document Vault', () => {
    const filePath = path.resolve(process.cwd(), 'app/family/more/resources.js');
    assert.strictEqual(fs.existsSync(filePath), true);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.match(content, /Phase 3/i);
    assert.match(content, /Document Vault/i);
    // Invariant: zero fake documents or mock file uploads
    assert.doesNotMatch(content, /passport\.pdf/i);
    assert.doesNotMatch(content, /uploadDocument/i);
});

check('NAV-P2-25', 'Scaffolding honesty: app/family/more/financials.js is read-only coordination with zero ledger mutations', () => {
    const filePath = path.resolve(process.cwd(), 'app/family/more/financials.js');
    assert.strictEqual(fs.existsSync(filePath), true);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.match(content, /Financial Coordination/i);
    // Invariant: zero ledger mutations or mock transaction entries
    assert.doesNotMatch(content, /addTransaction/i);
    assert.doesNotMatch(content, /recordExpense/i);
});

check('NAV-P2-26', 'Scaffolding honesty: app/family/more/readiness.js contains ZERO scoring formulas or fake metrics', () => {
    const filePath = path.resolve(process.cwd(), 'app/family/more/readiness.js');
    assert.strictEqual(fs.existsSync(filePath), true);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.match(content, /<Redirect href="\/family\/protection"/);
    // Invariant: zero fake scores or score calculation algorithms
    assert.doesNotMatch(content, /82%/);
    assert.doesNotMatch(content, /calculateReadiness/i);
    assert.doesNotMatch(content, /scoreWeight/i);
});

check('NAV-P2-27', 'Scaffolding honesty: app/family/operations.js & protection.js are honest placeholders without mock tasks/policies', () => {
    const opsPath = path.resolve(process.cwd(), 'app/family/operations.js');
    const protPath = path.resolve(process.cwd(), 'app/family/protection.js');
    assert.strictEqual(fs.existsSync(opsPath), true);
    assert.strictEqual(fs.existsSync(protPath), true);
    
    const opsContent = fs.readFileSync(opsPath, 'utf8');
    assert.match(opsContent, /Phase 4/i);
    assert.doesNotMatch(opsContent, /createTask/i);

    const protContent = fs.readFileSync(protPath, 'utf8');
    assert.match(protContent, /Protection & Care/i);
    assert.doesNotMatch(protContent, /insurancePolicyId/i);
});

// -----------------------------------------------------------------------------
// Category 7: Global FinLife Home Navigation & Responsive Layout (NAV-P2-28 to 35)
// -----------------------------------------------------------------------------

check('NAV-P2-28', 'FINLIFE_HOME_ROUTE authoritative constant points to /(tabs)', () => {
    assert.strictEqual(FINLIFE_HOME_ROUTE, '/(tabs)', 'Authoritative main FinLife home route must be /(tabs)');
});

check('NAV-P2-29', 'resolveGlobalHomeNavigationAction returns replace /(tabs) guaranteeing safe exit on direct entry', () => {
    const action = resolveGlobalHomeNavigationAction();
    assert.deepStrictEqual(action, { action: 'replace', route: '/(tabs)' });
});

check('NAV-P2-30', 'Global home navigation control in FamilyHeader.js is defined and targets FINLIFE_HOME_ROUTE', () => {
    const headerPath = path.resolve(process.cwd(), 'components/family/navigation/FamilyHeader.js');
    assert.strictEqual(fs.existsSync(headerPath), true);
    const content = fs.readFileSync(headerPath, 'utf8');
    assert.match(content, /handleGlobalHome/, 'Header must define handleGlobalHome');
    assert.match(content, /resolveGlobalHomeNavigationAction\(\)/, 'Header must invoke resolveGlobalHomeNavigationAction');
    assert.match(content, /FinLife Home/, 'Header must display visible FinLife Home text');
    assert.match(content, /accessibilityLabel="FinLife Home"/, 'Header must set accessible label for FinLife Home');
    assert.match(content, /testID="finlife-home-btn"/, 'Header must expose testID for primary screen FinLife Home button');
    assert.match(content, /testID="finlife-home-nested-btn"/, 'Header must expose testID for nested screen FinLife Home button');
});

check('NAV-P2-31', 'Global home navigation availability on /family: FamilyHeader on /family renders FinLife Home control', () => {
    const homePath = path.resolve(process.cwd(), 'app/family/index.js');
    assert.strictEqual(fs.existsSync(homePath), true);
    const content = fs.readFileSync(homePath, 'utf8');
    assert.match(content, /<FamilyHeader|<Page/);
    if (content.includes('<Page')) {
        assert.match(content, /topTabs/);
        assert.match(fs.readFileSync('components/family/navigation/FamilyUI.js','utf8'), /<FamilyHeader/);
    }
    assert.doesNotMatch(content, /showBack=\{true\}/, 'Family home has showBack=false, rendering left FinLife Home button');
});

check('NAV-P2-32', 'Global home navigation availability on /family/people: FamilyHeader on /family/people renders FinLife Home control', () => {
    const peoplePath = path.resolve(process.cwd(), 'app/family/people.js');
    assert.strictEqual(fs.existsSync(peoplePath), true);
    const content = fs.readFileSync(peoplePath, 'utf8');
    assert.match(content, /<FamilyHeader|<Page/);
    if (content.includes('<Page')) {
        assert.match(content, /topTabs/);
        assert.match(fs.readFileSync('components/family/navigation/FamilyUI.js','utf8'), /<FamilyHeader/);
    }
    assert.doesNotMatch(content, /showBack=\{true\}/, 'People screen renders left FinLife Home button');
});

check('NAV-P2-33', 'Global home navigation availability on /family/more: FamilyHeader on /family/more renders FinLife Home control', () => {
    const morePath = path.resolve(process.cwd(), 'app/family/more.js');
    assert.strictEqual(fs.existsSync(morePath), true);
    const content = fs.readFileSync(morePath, 'utf8');
    assert.match(content, /<FamilyHeader|<Page/);
    if (content.includes('<Page')) {
        assert.match(content, /topTabs/);
        assert.match(fs.readFileSync('components/family/navigation/FamilyUI.js','utf8'), /<FamilyHeader/);
    }
    assert.doesNotMatch(content, /showBack=\{true\}/, 'More screen renders left FinLife Home button');
});

check('NAV-P2-34', 'Global home navigation availability on /family/more/resources: FamilyHeader renders FinLife Home control', () => {
    const resPath = path.resolve(process.cwd(), 'app/family/more/resources.js');
    assert.strictEqual(fs.existsSync(resPath), true);
    const content = fs.readFileSync(resPath, 'utf8');
    assert.match(content, /<FamilyHeader|<Page/);
    if (content.includes('<Page')) {
        assert.match(content, /topTabs/);
        assert.match(fs.readFileSync('components/family/navigation/FamilyUI.js','utf8'), /<FamilyHeader/);
    }
    assert.match(content, /showBack=\{true\}/, 'Nested resources screen has showBack=true, rendering back + right FinLife Home button');
});

check('NAV-P2-35', 'Top tab bar responsiveness & anti-clipping: All 5 tabs are legible and layout employs responsive equal distribution', () => {
    const meta = getTabDisplayMetadata();
    assert.strictEqual(meta.length, 5);
    for (const tab of meta) {
        assert.strictEqual(tab.isLegible, true, `Tab ${tab.id} must have legible label`);
        assert.ok(tab.charLength >= 3 && tab.charLength <= 12, `Tab ${tab.label} length within bounds`);
    }

    const tabFile = path.resolve(process.cwd(), 'components/family/navigation/FamilyTopTabBar.js');
    const content = fs.readFileSync(tabFile, 'utf8');
    assert.match(content, /tabsRow/, 'FamilyTopTabBar must use tabsRow layout');
    assert.match(content, /flex:\s*1/, 'Tab buttons must use flex: 1 for equal distribution');
    assert.match(content, /numberOfLines=\{1\}/, 'Tab labels must specify single line rendering');
});

console.log('\n================================================================');
console.log(`🎉 ALL TESTS PASSED: ${passCount} / ${totalCount} checks verified`);
console.log('================================================================\n');

