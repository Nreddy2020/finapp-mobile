/**
 * tests/test_market_shock_local.mjs
 * On-device market shock model: uses recorded business numbers, never invents them.
 */
import assert from 'node:assert/strict';
import { clearAllData, updateBusinessStats } from '../services/storage.js';
import { simulateMarketShockLocally } from '../services/intelligence.js';
import { ApartmentSocietyService } from '../services/business/apartmentSocietyService.js';

let count = 0;
async function test(name, fn) { await fn(); count++; console.log('PASS ' + name); }
await clearAllData();

await test('No recorded business data yields an honest NO DATA result', async () => {
    const r = await simulateMarketShockLocally('RECESSION');
    assert.equal(r.hasData, false); assert.equal(r.activeCount, 0); assert.equal(r.profit, null); assert.equal(r.stress, 'NO DATA');
});
await test('Recorded module stats drive the scenario multipliers', async () => {
    await updateBusinessStats('rental', { monthlyRevenue: 100000, monthlyExpenses: 40000 });
    const normal = await simulateMarketShockLocally('NORMAL');
    assert.equal(normal.activeCount, 1); assert.equal(normal.revenue, 100000); assert.equal(normal.profit, 60000); assert.equal(normal.stress, 'NORMAL');
    const rec = await simulateMarketShockLocally('RECESSION');
    assert.equal(rec.revenue, 72000); assert.equal(rec.profit, 72000 - 43200); assert.equal(rec.stress, 'HIGH');
    const boom = await simulateMarketShockLocally('BOOM');
    assert.equal(boom.revenue, 122000); assert.ok(boom.profit > normal.profit);
});
await test('Apartment society P&L joins the model when it has billing', async () => {
    await ApartmentSocietyService.updateSociety({ name: 'Green', flatAmount: 2000 });
    await ApartmentSocietyService.addUnit({ number: '1' });
    const today = new Date().toISOString().slice(0, 10);
    let doc = await ApartmentSocietyService.generateInvoices(today.slice(0, 7), today);
    await ApartmentSocietyService.recordPayment(doc.invoices[0].id, { amount: 2000, date: today });
    const r = await simulateMarketShockLocally('NORMAL');
    assert.equal(r.activeCount, 2); assert.equal(r.revenue, 102000);
});
console.log(count + ' market shock cases passed using fixture storage only.');
