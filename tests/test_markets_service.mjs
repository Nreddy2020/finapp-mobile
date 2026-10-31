/**
 * tests/test_markets_service.mjs
 * Markets: calculators, watchlist prices and history, alerts, concentration and sentiment.
 */
import assert from 'node:assert/strict';
import { clearAllData } from '../services/storage.js';
import { MarketsService, sipFutureValue, lumpsumFutureValue, requiredSip, fdMaturity, rdMaturity, inflationAdjusted, realReturn, leverageLoss, positionSummary, concentration, sentiment, evaluateAlerts } from '../services/intelligence/marketsService.js';

let count = 0;
async function test(name, fn) { await fn(); count++; console.log('PASS ' + name); }
await clearAllData();

await test('SIP, lump sum and required SIP', async () => {
    const s = sipFutureValue({ monthly: 5000, annualRatePct: 12, years: 10 });
    assert.equal(s.invested, 600000); assert.ok(Math.abs(s.value - 1161695) < 2000);
    const l = lumpsumFutureValue({ amount: 100000, annualRatePct: 8, years: 9 });
    assert.ok(Math.abs(l.value - 199900) < 100); assert.equal(l.doublingYears, 9);
    const r = requiredSip({ target: 1000000, annualRatePct: 12, years: 10 });
    assert.ok(Math.abs(r.monthly - 4304) < 10);
    assert.throws(() => sipFutureValue({ monthly: 5000, annualRatePct: 12, years: 0 }), /years/);
});
await test('FD, RD, inflation and real return', async () => {
    assert.ok(Math.abs(fdMaturity({ principal: 100000, annualRatePct: 7, years: 5 }).maturity - 141478) < 5);
    const rd = rdMaturity({ monthly: 1000, annualRatePct: 7, years: 1 }); assert.equal(rd.invested, 12000); assert.ok(rd.maturity > 12400 && rd.maturity < 12500);
    const inf = inflationAdjusted({ amount: 100000, years: 10, inflationPct: 6 }); assert.ok(Math.abs(inf.futureCost - 179085) < 5);
    assert.equal(realReturn(12, 6), 5.66);
    const lev = leverageLoss({ collateral: 10000, leverage: 10, movePct: -5 }); assert.equal(lev.loss, 5000); assert.equal(lev.liquidationMovePct, 10);
    assert.equal(leverageLoss({ collateral: 10000, leverage: 20, movePct: -6 }).liquidated, true);
});
await test('Watchlist with prices, history and P&L', async () => {
    let doc = await MarketsService.addWatch({ symbol: 'niftybees', name: 'Nifty ETF', type: 'etf', quantity: 100, buyPrice: 200, price: 240 });
    doc = await MarketsService.addWatch({ symbol: 'GOLD', type: 'gold', quantity: 10, buyPrice: 6000, price: 7000 });
    assert.equal(doc.watchlist[0].symbol, 'NIFTYBEES');
    doc = await MarketsService.setPrice(doc.watchlist[0].id, 250, '2026-09-12');
    const p = positionSummary(doc.watchlist[0]);
    assert.equal(p.invested, 20000); assert.equal(p.value, 25000); assert.equal(p.pnlPct, 25); assert.ok(Math.abs(p.dayChangePct - 4.17) < 0.01);
    await assert.rejects(MarketsService.setPrice('nope', 1), /no longer/);
});
await test('Concentration warning and sentiment from own list', async () => {
    const doc = await MarketsService.load();
    const c = concentration(doc.watchlist);
    assert.equal(c.total, 95000); assert.equal(c.top.name, 'GOLD'); assert.ok(c.warning.includes('GOLD'));
    const s = sentiment(doc.watchlist);
    assert.equal(s.label, 'Euphoric'); assert.equal(s.breadth, '1 of 1 up');
});
await test('Alerts evaluate and record trigger time once', async () => {
    let doc = await MarketsService.load();
    doc = await MarketsService.addAlert({ watchId: doc.watchlist[0].id, direction: 'above', price: 245 });
    doc = await MarketsService.addAlert({ watchId: doc.watchlist[1].id, direction: 'below', price: 6500 });
    assert.equal(evaluateAlerts(doc).length, 1);
    const hits = await MarketsService.checkAlerts();
    assert.equal(hits.length, 1); const first = (await MarketsService.load()).alerts[0].triggeredAt; assert.ok(first);
    await MarketsService.checkAlerts(); assert.equal((await MarketsService.load()).alerts[0].triggeredAt, first);
    doc = await MarketsService.toggleAlert(doc.alerts[0].id); assert.equal(doc.alerts[0].active, false);
    doc = await MarketsService.removeWatch(doc.watchlist[1].id); assert.equal(doc.alerts.length, 1, 'alerts of removed items are removed');
    await assert.rejects(MarketsService.updateSettings({ riskProfile: 'yolo' }), /risk profile/);
});
console.log(count + ' markets cases passed using fixture storage only.');
