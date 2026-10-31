/**
 * tests/test_tax_engine.mjs
 * Deterministic Indian tax engine: slabs, rebate with marginal relief, deductions,
 * HRA, capital gains, regime comparison, advance-tax calendar and the compatible service.
 */
import assert from 'node:assert/strict';
import { clearAllData } from '../services/storage.js';
import { computeRegime, compareRegimes, hraExemption, deductionOpportunities, advanceTaxSchedule, filingChecklist } from '../services/tax/taxEngine.js';
import { TaxService } from '../services/tax.js';

let count = 0;
async function test(name, fn) { await fn(); count++; console.log('PASS ' + name); }
await clearAllData();

await test('FY 2025-26 new regime: 12.75L salaried pays nothing (rebate)', async () => {
    const r = computeRegime({ fy: '2025-26', income: 1275000, salaried: true }, 'New');
    assert.equal(r.taxableIncome, 1200000); assert.equal(r.totalTax, 0); assert.equal(r.rebate, 60000);
});
await test('FY 2025-26 new regime: 15L salaried', async () => {
    const r = computeRegime({ fy: '2025-26', income: 1500000, salaried: true }, 'New');
    assert.equal(r.taxableIncome, 1425000); assert.equal(r.slabTax, 93750); assert.equal(r.cess, 3750); assert.equal(r.totalTax, 97500); assert.equal(r.monthlyTax, 8125);
});
await test('Marginal relief just above the rebate limit', async () => {
    const r = computeRegime({ fy: '2025-26', income: 1285000, salaried: true }, 'New');
    assert.equal(r.taxableIncome, 1210000); assert.equal(r.taxAfterRebate, 10000); assert.equal(r.totalTax, 10400);
});
await test('Old regime with capped 80C and standard deduction', async () => {
    const r = computeRegime({ fy: '2025-26', income: 1000000, salaried: true, deductions: { '80C': 200000 } }, 'Old');
    assert.equal(r.deductionsApplied['80C'], 150000); assert.equal(r.taxableIncome, 800000); assert.equal(r.slabTax, 72500); assert.equal(r.totalTax, 75400);
});
await test('Old regime senior basic exemption and 80TTB', async () => {
    const r = computeRegime({ fy: '2025-26', income: 0, interestIncome: 400000, salaried: false, age: 65 }, 'Old');
    assert.equal(r.deductionsApplied['80TTA'], 50000); assert.equal(r.taxableIncome, 350000); assert.equal(r.slabTax, 2500); assert.equal(r.totalTax, 0, 'rebate covers it');
});
await test('HRA exemption is the minimum of the three limbs', async () => {
    assert.equal(hraExemption({ basic: 600000, hraReceived: 240000, rentPaid: 300000, metro: true }), 240000);
    assert.equal(hraExemption({ basic: 600000, hraReceived: 240000, rentPaid: 120000, metro: false }), 60000);
    assert.equal(hraExemption({ basic: 600000, hraReceived: 0, rentPaid: 120000 }), 0);
});
await test('Capital gains: equity LTCG exemption and STCG rate', async () => {
    const r = computeRegime({ fy: '2025-26', income: 0, salaried: false, capitalGains: { equityLtcg: 200000, equityStcg: 50000 } }, 'New');
    assert.equal(r.capitalGains.equityLtcgTaxable, 75000); assert.equal(r.capitalGains.equityLtcgTax, 9375); assert.equal(r.capitalGains.equityStcgTax, 10000);
    assert.equal(r.totalTax, Math.round((9375 + 10000) * 1.04));
});
await test('Regime comparison recommends the cheaper one', async () => {
    const c = compareRegimes({ fy: '2025-26', income: 1500000, salaried: true, deductions: { '80C': 150000, '80D': 25000, '24B': 200000, HRA: 200000 } });
    assert.equal(c.old.taxableIncome, 875000); assert.equal(c.recommended, 'Old'); assert.equal(c.saving, c.new.totalTax - c.old.totalTax);
    assert.equal(compareRegimes({ fy: '2025-26', income: 1500000, salaried: true }).recommended, 'New');
});
await test('Deduction opportunities list only real gaps', async () => {
    const o = deductionOpportunities({ fy: '2025-26', income: 1500000, salaried: true, deductions: { '80C': 100000 }, hra: { rentPaid: 120000 } });
    assert.equal(o.items.find(i => i.section === '80C').room, 50000);
    assert.ok(o.items.some(i => i.section === 'HRA / 80GG'));
    assert.equal(o.marginalRatePercent, 30);
});
await test('Advance tax calendar with statuses', async () => {
    const s = advanceTaxSchedule({ fy: '2025-26', income: 1500000, salaried: true, tdsPaid: 0, advanceTaxPaid: 14625 }, 'New', '2026-10-01');
    assert.equal(s.required, true); assert.equal(s.liability, 97500);
    assert.deepEqual(s.instalments.map(i => i.dueDate), ['2025-06-15', '2025-09-15', '2025-12-15', '2026-03-15']);
    assert.deepEqual(s.instalments.map(i => i.status), ['paid', 'overdue', 'overdue', 'overdue']);
    assert.equal(s.instalments[0].amount, 14625); assert.equal(s.instalments[1].amount, 29250);
    assert.equal(advanceTaxSchedule({ fy: '2025-26', income: 800000, salaried: true }, 'New').required, false);
});
await test('Filing checklist follows the profile; TaxService stays compatible and persists', async () => {
    const items = filingChecklist({ salaried: true, hra: { rentPaid: 100000 }, capitalGains: { equityLtcg: 1 } }).map(i => i.id);
    assert.ok(items.includes('form16') && items.includes('rent') && items.includes('cg'));
    const profile = await TaxService.getProfile();
    assert.equal(profile.regime, 'New'); assert.equal(profile.fy, '2025-26');
    const saved = await TaxService.saveProfile({ ...profile, income: 1500000 });
    const calc = TaxService.calculateTax(saved);
    assert.equal(calc.totalTax, 97500); assert.equal(calc.taxableIncome, 1425000); assert.equal(calc.taxPayload + calc.cess, calc.totalTax);
    assert.equal((await TaxService.getProfile()).income, 1500000);
});
console.log(count + ' tax engine cases passed.');
