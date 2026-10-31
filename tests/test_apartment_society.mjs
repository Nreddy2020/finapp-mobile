/**
 * tests/test_apartment_society.mjs
 * Business Hub / Apartment Society: units, idempotent billing, payments, late fees,
 * expenses, funds, tickets, bookings, vendors and reports.
 */
import assert from 'node:assert/strict';
import { clearAllData } from '../services/storage.js';
import { ApartmentSocietyService as S, collectionReport, expenseReport, profitAndLoss, fundBalances, occupancySummary, vendorAlerts, unitStatement, invoiceBalance, dashboard, generateBalanceSheet, seedReferenceSociety } from '../services/business/apartmentSocietyService.js';

let count = 0;
async function test(name, fn) { await fn(); count++; console.log('PASS ' + name); }
await clearAllData();
const today = '2026-09-20';

await test('Society setup and units', async () => {
    await S.updateSociety({ name: 'Green Meadows', maintenanceModel: 'flat', flatAmount: 2500, dueDay: 10, lateFeeType: 'flat', lateFeeValue: 100, openingBalances: { maintenance: 5000, corpus: 100000, sinking: 20000 } });
    await S.addUnit({ number: '101', block: 'A', sqft: 1000, ownerName: 'Ravi', occupancy: 'owner' });
    await S.addUnit({ number: '102', block: 'A', sqft: 1200, ownerName: 'Meena', occupancy: 'tenant', tenantName: 'Arjun' });
    let doc = await S.addUnit({ number: '201', block: 'A', sqft: 800, occupancy: 'vacant', customAmount: 2000 });
    await assert.rejects(S.addUnit({ number: '101', block: 'A' }), /already exists/);
    const occ = occupancySummary(doc);
    assert.equal(occ.total, 3); assert.equal(occ.occupancyRate, 67);
});
await test('Invoice generation is deterministic and idempotent', async () => {
    let doc = await S.generateInvoices('2026-09', today);
    assert.equal(doc.invoices.length, 3);
    assert.equal(doc.invoices.find(i => i.unitId === doc.units[2].id).amount, 2000, 'custom amount respected');
    doc = await S.generateInvoices('2026-09', today);
    assert.equal(doc.invoices.length, 3, 'no duplicates on replay');
    assert.equal(doc.invoices[0].dueDate, '2026-09-10');
    assert.equal(doc.invoices.every(i => i.lateFee === 100), true, 'late fee applied after due date');
});
await test('Per-sqft billing model', async () => {
    await S.updateSociety({ maintenanceModel: 'per_sqft', ratePerSqft: 2.5 });
    const doc = await S.generateInvoices('2026-10', '2026-10-01');
    const oct = doc.invoices.filter(i => i.period === '2026-10');
    assert.equal(oct.find(i => i.unitId === doc.units[0].id).amount, 2500); assert.equal(oct.find(i => i.unitId === doc.units[1].id).amount, 3000);
    assert.equal(oct.every(i => i.lateFee === 0), true);
});
await test('Partial and full payments, overpayment rejected, waive', async () => {
    let doc = await S.load();
    const inv = doc.invoices.find(i => i.period === '2026-09' && i.unitId === doc.units[0].id);
    doc = await S.recordPayment(inv.id, { amount: 1000, date: '2026-09-12', mode: 'upi' });
    let cur = doc.invoices.find(i => i.id === inv.id);
    assert.equal(cur.status, 'partial'); assert.equal(invoiceBalance(cur), 1600);
    await assert.rejects(S.recordPayment(inv.id, { amount: 5000 }), /exceeds/);
    doc = await S.recordPayment(inv.id, { amount: 1600, date: '2026-09-15', mode: 'cash' });
    cur = doc.invoices.find(i => i.id === inv.id); assert.equal(cur.status, 'paid'); assert.equal(invoiceBalance(cur), 0);
    const vacant = doc.invoices.find(i => i.period === '2026-09' && i.unitId === doc.units[2].id);
    doc = await S.waiveInvoice(vacant.id, 'Vacant unit');
    assert.equal(invoiceBalance(doc.invoices.find(i => i.id === vacant.id)), 0);
});
await test('Collection report and defaulters', async () => {
    const doc = await S.load();
    const r = collectionReport(doc, '2026-09', today);
    assert.equal(r.billed, 2600 + 2600); assert.equal(r.collected, 2600); assert.equal(r.outstanding, 2600); assert.equal(r.efficiency, 50);
    assert.equal(r.defaulters.length, 1); assert.equal(r.defaulters[0].unit.number, '102'); assert.equal(r.defaulters[0].overdueDays, 10);
    const st = unitStatement(doc, doc.units[0].id);
    assert.equal(st.totalPaid, 2600); assert.equal(st.totalDue, 2500);
});
await test('Expenses, funds and profit & loss', async () => {
    await S.addExpense({ date: '2026-09-05', category: 'Security', description: 'Guard salary', amount: 1500 });
    await S.addExpense({ date: '2026-09-18', category: 'Repairs', description: 'Pump repair', amount: 4000, paidFrom: 'sinking' });
    let doc = await S.addFundEntry({ type: 'corpus', direction: 'in', date: '2026-09-02', amount: 10000, note: 'New owner contribution' });
    const er = expenseReport(doc, '2026-09');
    assert.equal(er.total, 5500); assert.equal(er.byCategory[0].category, 'Repairs');
    const pnl = profitAndLoss(doc, '2026-09', today);
    assert.equal(pnl.cashCollected, 2600); assert.equal(pnl.expenses, 5500); assert.equal(pnl.surplus, -2900);
    const fb = fundBalances(doc);
    assert.equal(fb.corpus, 110000); assert.equal(fb.sinking, 16000); assert.equal(fb.maintenance, 5000 + 2600 - 1500);
    await assert.rejects(S.addExpense({ category: 'Security', description: 'x', amount: -5 }), /valid amount/);
});
await test('Tickets lifecycle', async () => {
    let doc = await S.load();
    doc = await S.addTicket({ title: 'Lift not working', category: 'Lift', priority: 'urgent', unitId: doc.units[0].id });
    const t = doc.tickets[0];
    doc = await S.updateTicket(t.id, { status: 'in_progress', note: 'Vendor called' });
    doc = await S.updateTicket(t.id, { status: 'resolved', note: 'Fixed' });
    assert.equal(doc.tickets[0].updates.length, 2); assert.ok(doc.tickets[0].resolvedAt);
    await assert.rejects(S.updateTicket(t.id, { status: 'vanished' }), /status/);
});
await test('Vendors with contract alerts, notices, meetings and decisions', async () => {
    let doc = await S.addVendor({ name: 'SafeGuard', service: 'Security', contractStart: '2025-10-01', contractEnd: '2026-10-05', monthlyCost: 15000 });
    assert.equal(vendorAlerts(doc, today).length, 1); assert.equal(vendorAlerts(doc, today)[0].daysLeft, 15);
    doc = await S.addNotice({ title: 'Water cut on Sunday', pinned: true, expiresOn: '2026-09-28' });
    doc = await S.addMeeting({ date: '2026-09-14', title: 'Monthly committee meeting', agenda: 'Budget, lift AMC' });
    doc = await S.addDecision(doc.meetings[0].id, { text: 'Renew lift AMC', ownerName: 'Ravi', dueDate: '2026-09-30' });
    doc = await S.toggleDecision(doc.meetings[0].id, doc.meetings[0].decisions[0].id);
    assert.equal(doc.meetings[0].decisions[0].done, true);
});
await test('Amenity bookings prevent double booking; visitors check in and out', async () => {
    let doc = await S.addAmenity({ name: 'Clubhouse', fee: 500, slots: 'Morning, Evening' });
    doc = await S.bookAmenity({ amenityId: doc.amenities[0].id, unitId: doc.units[0].id, date: '2026-09-25', slot: 'Evening' });
    await assert.rejects(S.bookAmenity({ amenityId: doc.amenities[0].id, unitId: doc.units[1].id, date: '2026-09-25', slot: 'Evening' }), /already booked/);
    await assert.rejects(S.bookAmenity({ amenityId: doc.amenities[0].id, date: '2026-09-25', slot: 'Night' }), /available slots/);
    doc = await S.checkInVisitor({ unitId: doc.units[0].id, name: 'Courier', purpose: 'Delivery' });
    assert.equal(dashboard(doc, today).visitorsInside, 1);
    doc = await S.checkOutVisitor(doc.visitors[0].id);
    assert.equal(dashboard(doc, today).visitorsInside, 0);
    const d = dashboard(doc, today);
    assert.equal(d.pinnedNotices.length, 1); assert.equal(d.upcomingBookings.length, 1); assert.equal(d.tickets.open, 0);
});
await test('Units with billing history cannot be deleted; invoices with payments cannot be deleted', async () => {
    const doc = await S.load();
    await assert.rejects(S.removeUnit(doc.units[0].id), /billing history/);
    await assert.rejects(S.removeInvoice(doc.invoices.find(i => i.payments.length).id), /has payments/);
});

await test('Term Deposits CRUD and validation', async () => {
    let doc = await S.addTermDeposit({
        bank: 'HDFC Bank',
        accountOrCertNo: 'HDFC-FD-101',
        depositDate: '2026-01-01',
        maturityDate: '2027-01-01',
        principalAmount: 50000,
        interestRate: 6.5,
        maturityAmount: 53250,
        fundType: 'corpus',
        notes: 'Testing deposit'
    });
    const td = doc.termDeposits[0];
    assert.equal(td.bank, 'HDFC Bank');
    assert.equal(td.principalAmount, 50000);
    assert.equal(td.maturityAmount, 53250);

    doc = await S.updateTermDeposit(td.id, { maturityAmount: 53500 });
    assert.equal(doc.termDeposits.find(t => t.id === td.id).maturityAmount, 53500);

    doc = await S.removeTermDeposit(td.id);
    assert.equal(doc.termDeposits.some(t => t.id === td.id), false);
});

await test('Adhoc charges and AMC tracking', async () => {
    const docLoaded = await S.load();
    const unit = docLoaded.units[0];
    let doc = await S.addAdhocCharge({
        unitId: unit.id,
        category: 'lift',
        title: 'Lift shifting fee',
        period: '2026-09',
        amount: 500,
        date: '2026-09-15',
        status: 'due'
    });
    const chg = doc.adhocCharges[0];
    assert.equal(chg.amount, 500);
    assert.equal(chg.status, 'due');

    doc = await S.recordAdhocPayment(chg.id, { date: '2026-09-16', mode: 'upi', reference: 'UPI123' });
    assert.equal(doc.adhocCharges.find(c => c.id === chg.id).status, 'paid');

    doc = await S.recordAmcPayment({
        unitId: unit.id,
        year: '2026',
        amount: 1000,
        receiptNo: 'AMC-001'
    });
    assert.equal(doc.amcRecords.find(r => r.unitId === unit.id).amount, 1000);
});

await test('Seed January 2026 reference society matches physical balance sheet figures', async () => {
    const doc = await S.seedReferenceSociety();
    assert.equal(doc.society.name, 'Sri Venkateswara Enclave Flat Owners Welfare Association');
    assert.equal(doc.society.openingBalances.maintenance, 29151);

    const bs = generateBalanceSheet(doc, '2026-01');

    // 1. Opening Balance
    assert.equal(bs.openingBalance, 29151);

    // 2. Block-wise maintenance collections
    const colA = bs.receipts.blockCollections.find(b => b.block === 'A Block');
    const colB = bs.receipts.blockCollections.find(b => b.block === 'B Block');
    const colC = bs.receipts.blockCollections.find(b => b.block === 'C Block');
    assert.equal(colA?.amount, 52000, 'A Block maintenance collections should be ₹52,000');
    assert.equal(colB?.amount, 68900, 'B Block maintenance collections should be ₹68,900');
    assert.equal(colC?.amount, 34500, 'C Block maintenance collections should be ₹34,500');
    assert.equal(bs.receipts.totalMaintenanceCollected, 155400);

    // 3. Advances, Lift, Parking
    assert.equal(bs.receipts.totalAdvances, 5100, 'Advances total should be ₹5,100 (2500 + 2600)');
    assert.equal(bs.receipts.totalLift, 1000, 'Lift charges total should be ₹1,000 (500 + 500)');
    assert.equal(bs.receipts.totalParking, 1100, 'Parking rent should be ₹1,100');
    assert.equal(bs.receipts.totalCollectionsThisMonth, 162600, 'Total monthly collections should be ₹1,62,600');
    assert.equal(bs.receipts.totalInflows, 191751, 'Total receipts with opening balance should be ₹1,91,751');

    // 4. Expenditures
    assert.equal(bs.expenditure.totalExpenditure, 165882, 'Total expenditure should be ₹1,65,882');

    // 5. Closing cash balance
    assert.equal(bs.closingBalance, 25869, 'Closing balance must be exactly ₹25,869 (191,751 - 165,882)');

    // 6. Corpus Fund Term Deposits
    assert.equal(bs.termDeposits.items.length, 4, 'Should have 4 fixed deposits');
    assert.equal(bs.termDeposits.totalPrincipal, 584267, 'Total deposit principal must be ₹5,84,267');
    assert.equal(bs.termDeposits.totalMaturity, 620732, 'Total maturity amount must be ₹6,20,732');

    // 7. AMC Collections
    assert.equal(bs.amc.collected, 92000, 'AMC collected must be ₹92,000');
    assert.equal(bs.amc.paidCount, 92);
    assert.equal(bs.amc.pendingCount, 5);

    // 8. Chronic multi-month defaulters
    const defA201 = bs.defaultersLedger.find(d => d.unitLabel === 'A-201');
    assert.ok(defA201, 'A-201 should be in defaulters ledger');
    assert.equal(defA201.monthCount, 11, 'A-201 should have 11 months pending');
    assert.equal(defA201.totalDue, 27500, 'A-201 total due should be ₹27,500');

    const defA206 = bs.defaultersLedger.find(d => d.unitLabel === 'A-206');
    assert.ok(defA206, 'A-206 should be in defaulters ledger');
    assert.equal(defA206.adhocDue, 500, 'A-206 should have ₹500 function charge due');
    assert.equal(defA206.totalDue, 14600, 'A-206 total due should be ₹14,600 (14,100 + 500)');
});

console.log(count + ' apartment society cases passed using fixture storage only.');
