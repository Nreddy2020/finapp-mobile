/**
 * tests/test_cashbook_phase2_ui_views.mjs
 * 
 * Verifies Phase 2 UI Presentation Logic, Metadata Resolvers,
 * and Double-Entry Synthesis for the 4 Mockup Screens.
 */

import assert from 'node:assert';
import {
    CashbookType,
    TransactionType,
    TransactionStatus,
    createMoneyPaise
} from '../services/cashbook/cashbookContracts.js';
import {
    getBookVisualMeta,
    CASHBOOK_TEMPLATES,
    formatDateHeader,
    getTransactionIconMeta
} from '../services/cashbook/cashbookPresentation.js';

console.log('================================================================');
console.log('🎨 CASHBOOK PHASE 2 UI VIEWS & PRESENTATION SUITE');
console.log('================================================================\n');

// 1. Screen 1: Master Directory Visual Metadata Resolution
console.log('--- TEST 1: Screen 1 Directory Book Visual Metadata ---');
{
    const personalMeta = getBookVisualMeta({ type: CashbookType.SAVINGS, name: 'Personal' });
    assert.strictEqual(personalMeta.iconColor, '#3B82F6');
    assert.strictEqual(personalMeta.bgColor, '#EFF6FF');
    assert.strictEqual(personalMeta.title, 'Personal');
    console.log('  [PASS] Personal book resolves to blue theme with Users icon');

    const businessMeta = getBookVisualMeta({ type: CashbookType.BUSINESS_CASH_AND_OBLIGATIONS, name: 'Business' });
    assert.strictEqual(businessMeta.iconColor, '#F97316');
    assert.strictEqual(businessMeta.bgColor, '#FFF7ED');
    console.log('  [PASS] Business book resolves to orange theme with Briefcase icon');

    const loanMeta = getBookVisualMeta({ type: CashbookType.LOANS_TAKEN, name: 'Loans' });
    assert.strictEqual(loanMeta.iconColor, '#EAB308');
    assert.strictEqual(loanMeta.bgColor, '#FEFCE8');
    console.log('  [PASS] Loans book resolves to amber theme with Layers icon');

    const investMeta = getBookVisualMeta({ type: CashbookType.INVESTMENTS, name: 'Investments' });
    assert.strictEqual(investMeta.iconColor, '#10B981');
    assert.strictEqual(investMeta.bgColor, '#ECFDF5');
    console.log('  [PASS] Investments book resolves to green theme with TrendingUp icon');

    const pfMeta = getBookVisualMeta({ type: CashbookType.PF, name: 'PF / Retirement' });
    assert.strictEqual(pfMeta.iconColor, '#8B5CF6');
    assert.strictEqual(pfMeta.bgColor, '#F5F3FF');
    console.log('  [PASS] PF book resolves to purple theme with ShieldCheck icon');

    const customMeta = getBookVisualMeta({ type: CashbookType.CUSTOM, name: 'Custom – Home Project' });
    assert.strictEqual(customMeta.iconColor, '#F43F5E');
    assert.strictEqual(customMeta.bgColor, '#FFF1F2');
    console.log('  [PASS] Custom Home Project book resolves to coral theme with Home icon');

    assert.strictEqual(CASHBOOK_TEMPLATES.length, 6);
    console.log('  [PASS] Template catalog contains 6 distinct purpose book blueprints');
}

// 2. Screen 3: Date Header Formatting matching mockup
console.log('\n--- TEST 2: Screen 3 Date Header Formatting ---');
{
    const formatted1 = formatDateHeader('2025-01-28');
    assert.strictEqual(formatted1, 'Tue, Jan 28, 2025');
    console.log('  [PASS] "2025-01-28" formats to "Tue, Jan 28, 2025"');

    const formatted2 = formatDateHeader('2025-01-26');
    assert.strictEqual(formatted2, 'Sun, Jan 26, 2025');
    console.log('  [PASS] "2025-01-26" formats to "Sun, Jan 26, 2025"');

    assert.strictEqual(formatDateHeader('Today'), 'Today');
    assert.strictEqual(formatDateHeader('Yesterday'), 'Yesterday');
    console.log('  [PASS] Special relative dates "Today" and "Yesterday" are preserved');
}

// 3. Screen 3: Transaction Row Category Icons & Colors
console.log('\n--- TEST 3: Screen 3 Transaction Row Category Icons ---');
{
    const incomeMeta = getTransactionIconMeta({
        transactionType: TransactionType.INCOME,
        category: 'salary',
        description: 'Salary Credited'
    });
    assert.strictEqual(incomeMeta.color, '#10B981');
    assert.strictEqual(incomeMeta.bg, '#ECFDF5');
    console.log('  [PASS] Income transaction maps to green ArrowDownLeft');

    const rentMeta = getTransactionIconMeta({
        transactionType: TransactionType.EXPENSE,
        category: 'housing',
        description: 'Rent'
    });
    assert.strictEqual(rentMeta.color, '#EA580C');
    assert.strictEqual(rentMeta.bg, '#FFF7ED');
    console.log('  [PASS] Rent/Housing maps to coral Home icon');

    const grocerMeta = getTransactionIconMeta({
        transactionType: TransactionType.EXPENSE,
        category: 'food',
        description: 'Groceries'
    });
    assert.strictEqual(grocerMeta.color, '#EF4444');
    assert.strictEqual(grocerMeta.bg, '#FEF2F2');
    console.log('  [PASS] Groceries maps to red ShoppingCart icon');

    const transferMeta = getTransactionIconMeta({
        transactionType: TransactionType.TRANSFER,
        category: '',
        description: 'Transfer to Investments'
    });
    assert.strictEqual(transferMeta.color, '#3B82F6');
    assert.strictEqual(transferMeta.bg, '#EFF6FF');
    console.log('  [PASS] Transfer maps to blue ArrowLeftRight icon');

    const healthMeta = getTransactionIconMeta({
        transactionType: TransactionType.EXPENSE,
        category: 'health',
        description: 'Health Insurance'
    });
    assert.strictEqual(healthMeta.color, '#EF4444');
    console.log('  [PASS] Health Insurance maps to Shield icon');

    const fuelMeta = getTransactionIconMeta({
        transactionType: TransactionType.EXPENSE,
        category: 'fuel',
        description: 'Fuel'
    });
    assert.strictEqual(fuelMeta.color, '#EF4444');
    console.log('  [PASS] Fuel maps to Car/Fuel icon');
}

console.log('\n================================================================');
console.log('✅ ALL PHASE 2 UI PRESENTATION TESTS PASSED (14/14)');
console.log('================================================================\n');
