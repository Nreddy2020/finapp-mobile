import assert from 'node:assert/strict';
import { calculateUpdatedBias, EstimateLearningEngine } from '../../services/time/estimateLearningEngine.js';
import { clearAllData } from '../../services/storage.js';

let count = 0;
async function test(name, fn) { await fn(); count++; console.log('PASS ' + name); }

await clearAllData();

await test('calculateUpdatedBias applies EMA with learning rate eta = 0.25', async () => {
    // Start with bias = 1.0. Run a session planned 30m, actual 45m (ratio 1.5)
    // newBias = 0.75 * 1.0 + 0.25 * 1.5 = 1.125
    const res1 = calculateUpdatedBias(null, { plannedMinutes: 30, actualMinutes: 45 });
    assert.equal(res1.biasFactor, 1.125);
    assert.equal(res1.sessionCount, 1);
    assert.equal(res1.consecutiveOverrunCount, 1);
    assert.equal(res1.shouldSuggestCalibration, false);
});

await test('Neutral zone (1.06 to 1.24) preserves overrun counter; ratio <= 1.05 resets it', async () => {
    let state = { biasFactor: 1.15, sessionCount: 2, consecutiveOverrunCount: 2 };
    
    // Neutral session: planned 100m, actual 110m (ratio 1.10)
    const resNeutral = calculateUpdatedBias(state, { plannedMinutes: 100, actualMinutes: 110 });
    assert.equal(resNeutral.consecutiveOverrunCount, 2, 'Counter must stay 2 in neutral zone');

    // On-time session: planned 60m, actual 60m (ratio 1.0) -> Must reset to 0!
    const resReset = calculateUpdatedBias(resNeutral, { plannedMinutes: 60, actualMinutes: 60 });
    assert.equal(resReset.consecutiveOverrunCount, 0, 'On-time session must reset consecutiveOverrunCount');
});

await test('Dual-horizon trigger: moderate overrun (1.25) fires at session 8, severe overrun (1.50) fires at session 4', async () => {
    // 1. Test moderate overrun: 1.25 ratio
    let moderate = null;
    for (let i = 1; i <= 4; i++) {
        moderate = calculateUpdatedBias(moderate, { plannedMinutes: 40, actualMinutes: 50 });
    }
    // At session 4 with ratio 1.25, bias is ~1.1709 (below 1.20 and 1.30) -> should NOT fire
    assert.equal(moderate.consecutiveOverrunCount, 4);
    assert.ok(moderate.biasFactor < 1.20);
    assert.equal(moderate.shouldSuggestCalibration, false, 'Session 4 at 1.25 should not fire');

    // Run 4 more sessions at 1.25 (total 8 sessions)
    for (let i = 5; i <= 8; i++) {
        moderate = calculateUpdatedBias(moderate, { plannedMinutes: 40, actualMinutes: 50 });
    }
    // At session 8, count = 8 and bias ~ 1.225 (>= 1.20) -> persistent moderate trigger fires!
    assert.equal(moderate.consecutiveOverrunCount, 8);
    assert.ok(moderate.biasFactor >= 1.20, `Expected bias >= 1.20, got ${moderate.biasFactor}`);
    assert.equal(moderate.shouldSuggestCalibration, true, 'Session 8 at 1.25 must fire persistent trigger');

    // 2. Test severe overrun: 1.50 ratio fires fast on session 4
    let severe = null;
    for (let i = 1; i <= 4; i++) {
        severe = calculateUpdatedBias(severe, { plannedMinutes: 30, actualMinutes: 45 });
    }
    assert.equal(severe.consecutiveOverrunCount, 4);
    assert.ok(severe.biasFactor >= 1.30, `Expected severe bias >= 1.30, got ${severe.biasFactor}`);
    assert.equal(severe.shouldSuggestCalibration, true, 'Session 4 at 1.50 must fire severe trigger');
});

await test('EstimateLearningEngine persistence and calibrated estimate round-trip', async () => {
    // Record sessions for 'physics'
    await EstimateLearningEngine.recordSession({ subject: 'Physics', plannedMinutes: 30, actualMinutes: 45 });
    await EstimateLearningEngine.recordSession({ subject: 'Physics', plannedMinutes: 30, actualMinutes: 45 });

    const baselines = await EstimateLearningEngine.getBaselines();
    assert.ok(baselines.physics, 'Physics baseline must be persisted');
    assert.equal(baselines.physics.sessionCount, 2);

    // Calibrated estimate for 60m planned physics
    const calibrated = await EstimateLearningEngine.getCalibratedEstimate('Physics', 60);
    assert.ok(calibrated > 60, `Calibrated estimate ${calibrated} must be higher than 60`);
});

await test('acceptCalibration resets consecutiveOverrunCount and suppresses repeat prompts', async () => {
    // Subject 'chemistry': trigger severe overrun across 4 sessions
    for (let i = 0; i < 4; i++) {
        await EstimateLearningEngine.recordSession({ subject: 'Chemistry', plannedMinutes: 30, actualMinutes: 50 });
    }

    let baselines = await EstimateLearningEngine.getBaselines();
    assert.equal(baselines.chemistry.shouldSuggestCalibration, true);
    assert.equal(baselines.chemistry.consecutiveOverrunCount, 4);

    const suggestions = await EstimateLearningEngine.getSuggestions();
    const chemSug = suggestions.find(s => s.subjectKey === 'chemistry');
    assert.ok(chemSug, 'Pending suggestion must be created');
    assert.equal(chemSug.status, 'PENDING');

    // User accepts calibration
    await EstimateLearningEngine.acceptCalibration('Chemistry');
    baselines = await EstimateLearningEngine.getBaselines();
    assert.equal(baselines.chemistry.consecutiveOverrunCount, 0, 'consecutiveOverrunCount must reset to 0 upon acceptance');
    assert.equal(baselines.chemistry.shouldSuggestCalibration, false, 'shouldSuggestCalibration must be cleared');
    assert.equal(baselines.chemistry.lastActionStatus, 'ACCEPTED');

    const updatedSuggestions = await EstimateLearningEngine.getSuggestions();
    const acceptedSug = updatedSuggestions.find(s => s.subjectKey === 'chemistry');
    assert.equal(acceptedSug.status, 'ACCEPTED');

    // The next session does NOT re-trigger calibration prompt immediately
    const nextSession = await EstimateLearningEngine.recordSession({ subject: 'Chemistry', plannedMinutes: 30, actualMinutes: 45 });
    assert.equal(nextSession.shouldSuggestCalibration, false, 'Subsequent session must not immediately re-prompt');
    assert.equal(nextSession.consecutiveOverrunCount, 1);
});

await test('dismissCalibration suppresses repeat prompts for 4 sessions', async () => {
    // Subject 'math': 4 overruns to trigger suggestion
    for (let i = 0; i < 4; i++) {
        await EstimateLearningEngine.recordSession({ subject: 'Math', plannedMinutes: 30, actualMinutes: 50 });
    }

    let baselines = await EstimateLearningEngine.getBaselines();
    assert.equal(baselines.math.shouldSuggestCalibration, true);

    // User dismisses calibration
    await EstimateLearningEngine.dismissCalibration('Math');
    baselines = await EstimateLearningEngine.getBaselines();
    assert.equal(baselines.math.lastActionStatus, 'DISMISSED');
    assert.equal(baselines.math.shouldSuggestCalibration, false);
    assert.equal(baselines.math.suppressUntilSessionCount, 8); // 4 + 4 = 8

    // Next 4 overrunning sessions (sessions 5, 6, 7, 8: N+1 to N+4) must remain suppressed
    for (let i = 5; i <= 8; i++) {
        const res = await EstimateLearningEngine.recordSession({ subject: 'Math', plannedMinutes: 30, actualMinutes: 50 });
        assert.equal(res.shouldSuggestCalibration, false, `Session ${i} (N+${i - 4}) must be suppressed`);
    }

    // Session 9 (N+5): suppression window expired, so calibration prompt is re-eligible!
    const res9 = await EstimateLearningEngine.recordSession({ subject: 'Math', plannedMinutes: 30, actualMinutes: 50 });
    assert.equal(res9.shouldSuggestCalibration, true, 'Session 9 (N+5) must be re-eligible for calibration suggestion');
});

console.log(`ALL ${count} ESTIMATE LEARNING ENGINE TESTS PASSED`);
