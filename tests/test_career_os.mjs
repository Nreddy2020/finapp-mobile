/**
 * tests/test_career_os.mjs
 * Career OS: profile, goals, skills, learning ROI, applications, income growth and summary.
 */
import assert from 'node:assert/strict';
import { clearAllData } from '../services/storage.js';
import { CareerOsService, learningRoi, negotiationPlan, incomeGrowth, careerSummary, skillGap } from '../services/career/careerOsService.js';

let count = 0;
async function test(name, fn) { await fn(); count++; console.log('PASS ' + name); }
await clearAllData();

await test('Profile updates validate and persist', async () => {
    const doc = await CareerOsService.updateProfile({ role: 'Analyst', company: 'Acme', monthlyIncome: '45,000', targetMonthlyIncome: 60000, startDate: '2024-06-01' });
    assert.equal(doc.profile.monthlyIncome, 45000); assert.equal(doc.profile.startDate, '2024-06-01');
    await assert.rejects(CareerOsService.updateProfile({ startDate: 'June' }), /start date/);
});
await test('Goals with milestones report progress', async () => {
    let doc = await CareerOsService.addGoal({ title: 'Become senior analyst', type: 'promotion', targetDate: '2027-03-31' });
    const g = doc.goals[0];
    doc = await CareerOsService.addMilestone(g.id, 'Lead one project');
    doc = await CareerOsService.addMilestone(g.id, 'Complete SQL certification');
    doc = await CareerOsService.toggleMilestone(g.id, doc.goals[0].milestones[0].id);
    assert.equal(careerSummary(doc, '2026-09-11').activeGoals, 1);
    await assert.rejects(CareerOsService.addGoal({ title: 'x', type: 'dream' }), /goal type/);
});
await test('Skills gap and learning ROI', async () => {
    let doc = await CareerOsService.addSkill({ name: 'SQL', current: 4, target: 8 });
    doc = await CareerOsService.addSkill({ name: 'Presenting', current: 6, target: 7 });
    assert.equal(skillGap(doc.skills[0]), 4);
    const roi = learningRoi({ cost: 12000, monthlyIncrease: 2000 });
    assert.equal(roi.paybackMonths, 6); assert.equal(roi.netOverYears, 2000 * 60 - 12000); assert.equal(roi.worthIt, true);
    assert.equal(learningRoi({ cost: 500000, monthlyIncrease: 1000 }).worthIt, false);
    doc = await CareerOsService.addLearning({ title: 'Advanced SQL', cost: 12000, hours: 40, skillId: doc.skills[0].id, monthlyIncrease: 2000 });
    const s = careerSummary(doc, '2026-09-11');
    assert.equal(s.learningSpend, 12000); assert.equal(s.biggestGap.name, 'SQL');
});
await test('Negotiation plan anchors from user-entered market range', async () => {
    const plan = negotiationPlan({ currentMonthly: 45000, marketLow: 50000, marketHigh: 70000, targetRaisePercent: 20 });
    assert.equal(plan.walkAway, 50000); assert.equal(plan.target, 60000); assert.equal(plan.anchor, 66000); assert.equal(plan.raisePercent, 33);
    assert.throws(() => negotiationPlan({ currentMonthly: 1, marketLow: 10, marketHigh: 5 }), /at least the market low/);
});
await test('Applications move through stages with history', async () => {
    let doc = await CareerOsService.addApplication({ company: 'Globex', role: 'Senior Analyst', stage: 'applied', appliedDate: '2026-09-01' });
    const a = doc.applications[0];
    doc = await CareerOsService.setApplicationStage(a.id, 'interview');
    doc = await CareerOsService.setApplicationStage(a.id, 'offer', { offeredMonthly: 62000 });
    assert.equal(doc.applications[0].history.length, 3); assert.equal(doc.applications[0].offeredMonthly, 62000);
    assert.equal(careerSummary(doc, '2026-09-11').pipeline.offer, 1);
    await assert.rejects(CareerOsService.setApplicationStage(a.id, 'ghosted'), /stage/);
});
await test('Income history drives growth and updates profile income', async () => {
    let doc = await CareerOsService.addIncomeRecord({ date: '2024-06-01', monthlyAmount: 40000 });
    doc = await CareerOsService.addIncomeRecord({ date: '2026-06-01', monthlyAmount: 48400 });
    const g = incomeGrowth(doc.incomeHistory);
    assert.equal(g.growthPercent, 21); assert.equal(g.cagrPercent, 10); assert.equal(doc.profile.monthlyIncome, 48400);
    const s = careerSummary(doc, '2026-09-11');
    assert.equal(s.incomeGapToTarget, 60000 - 48400);
});
await test('Certifications expiring soon surface in summary', async () => {
    const doc = await CareerOsService.addCertification({ name: 'First Aid', issuer: 'Red Cross', obtainedDate: '2024-10-01', expiryDate: '2026-10-01' });
    assert.equal(careerSummary(doc, '2026-09-11').expiringCerts.length, 1);
});
console.log(count + ' career OS cases passed using fixture storage only.');
