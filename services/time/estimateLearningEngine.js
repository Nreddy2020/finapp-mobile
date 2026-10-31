/**
 * services/time/estimateLearningEngine.js
 *
 * Exponential Moving Average (EMA) estimate calibration engine.
 * Learns empirical duration biases per subject/category to correct the planning fallacy.
 *
 * Invariants:
 * - Update formula: beta = (1 - eta) * beta_prev + eta * (actual / estimated), with eta = 0.25.
 * - Neutral tolerance zone: ratios in [0.90, 1.15] do not alter overrun counters.
 * - Reset condition: ratio <= 1.05 resets consecutiveOverrunCount to 0.
 * - Trigger condition: consecutiveOverrunCount >= 4 AND biasFactor >= 1.25.
 */

import { StorageService } from '../storage.js';

export const TIME_INTELLIGENCE_STORAGE_KEY = 'finlife_time_intelligence_v1';
export const LEARNING_RATE_ETA = 0.25;

export function emptyIntelligenceDoc() {
    return {
        version: 1,
        learningBaselines: {}, // { [subject: string]: { biasFactor, sessionCount, consecutiveOverrunCount, lastUpdatedUtc, lastActionStatus, suppressUntilSessionCount } }
        adaptiveSuggestions: [], // [ { id, subjectKey, suggestedBias, sessionCount, status: 'PENDING' | 'ACCEPTED' | 'DISMISSED', createdAtUtc, resolvedAtUtc } ]
        pacingSnapshots: {},
        userEnergyCurve: {
            morningMultiplier: 0.90,
            afternoonMultiplier: 0.65,
            eveningMultiplier: 0.45
        }
    };
}

let queue = Promise.resolve();

async function loadIntelligenceDoc() {
    const raw = await StorageService.load(TIME_INTELLIGENCE_STORAGE_KEY, null, { strict: false });
    if (!raw || raw.version !== 1 || !raw.learningBaselines) {
        return emptyIntelligenceDoc();
    }
    if (!Array.isArray(raw.adaptiveSuggestions)) {
        raw.adaptiveSuggestions = [];
    }
    return raw;
}

async function saveIntelligenceDoc(doc) {
    const res = await StorageService.save(TIME_INTELLIGENCE_STORAGE_KEY, doc, { atomic: true });
    if (!res?.success) throw new Error('Could not persist time intelligence data.');
    return doc;
}

/**
 * Pure calculation for updating a subject's bias record after a completed session.
 */
export function calculateUpdatedBias(existingRecord = null, { plannedMinutes, actualMinutes }) {
    const planned = Math.max(1, Math.round(plannedMinutes));
    const actual = Math.max(1, Math.round(actualMinutes));
    const ratio = actual / planned;

    const prevBias = existingRecord?.biasFactor ?? 1.0;
    const prevSessions = existingRecord?.sessionCount ?? 0;
    const prevOverruns = existingRecord?.consecutiveOverrunCount ?? 0;
    const suppressUntil = existingRecord?.suppressUntilSessionCount ?? 0;

    // EMA update with learning rate eta = 0.25
    const newBias = Number(((1 - LEARNING_RATE_ETA) * prevBias + LEARNING_RATE_ETA * ratio).toFixed(4));
    const newSessionCount = prevSessions + 1;

    let newOverruns = prevOverruns;
    if (ratio >= 1.25) {
        newOverruns += 1;
    } else if (ratio <= 1.05) {
        newOverruns = 0; // Reset
    }
    // Note: ratio in (1.05, 1.25) is the neutral zone; counter remains unchanged.

    // Dual-horizon trigger:
    // 1. Fast trigger: Severe overrun (bias >= 1.30 across >= 4 consecutive overruns)
    const severeTrigger = newOverruns >= 4 && newBias >= 1.30;
    // 2. Persistence trigger: Moderate overrun (bias >= 1.20 sustained across >= 8 consecutive overruns)
    const persistentModerateTrigger = newOverruns >= 8 && newBias >= 1.20;

    const thresholdCrossed = severeTrigger || persistentModerateTrigger;

    // Suppress repeat suggestions if within a dismissal suppression window
    const isSuppressed = newSessionCount <= suppressUntil;
    const shouldSuggestCalibration = thresholdCrossed && !isSuppressed;

    return {
        biasFactor: newBias,
        sessionCount: newSessionCount,
        consecutiveOverrunCount: newOverruns,
        lastRatio: ratio,
        shouldSuggestCalibration,
        lastActionStatus: shouldSuggestCalibration ? 'PENDING' : (existingRecord?.lastActionStatus ?? null),
        lastActionAtSessionCount: existingRecord?.lastActionAtSessionCount ?? null,
        suppressUntilSessionCount: suppressUntil,
        recommendedBaselineMinutes: shouldSuggestCalibration ? Math.round(planned * newBias) : null,
        overrunDifferenceMinutes: shouldSuggestCalibration ? Math.max(1, Math.round(planned * (newBias - 1))) : null
    };
}

export const EstimateLearningEngine = {
    /**
     * Records a session outcome and updates the subject's bias factor.
     */
    recordSession: ({ subject, plannedMinutes, actualMinutes, now = new Date().toISOString() }) => {
        const key = (subject || 'General').trim().toLowerCase();
        const pending = queue.then(async () => {
            const doc = await loadIntelligenceDoc();
            const existing = doc.learningBaselines[key] || null;
            const updated = calculateUpdatedBias(existing, { plannedMinutes, actualMinutes });

            doc.learningBaselines[key] = {
                ...updated,
                subjectKey: key,
                lastUpdatedUtc: now
            };

            // Maintain adaptiveSuggestions queue (create or refresh live values)
            if (updated.shouldSuggestCalibration) {
                const existingPending = doc.adaptiveSuggestions.find(s => s.subjectKey === key && s.status === 'PENDING');
                if (!existingPending) {
                    doc.adaptiveSuggestions.push({
                        id: `sug-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                        subjectKey: key,
                        suggestedBias: updated.biasFactor,
                        sessionCount: updated.sessionCount,
                        status: 'PENDING',
                        createdAtUtc: now,
                        lastUpdatedUtc: now
                    });
                } else {
                    // Update live values on existing pending suggestion to prevent staleness
                    existingPending.suggestedBias = updated.biasFactor;
                    existingPending.sessionCount = updated.sessionCount;
                    existingPending.lastUpdatedUtc = now;
                }
            }

            await saveIntelligenceDoc(doc);
            return updated;
        });
        queue = pending.catch(() => {});
        return pending;
    },

    /**
     * Accepts a proposed calibration baseline for a subject.
     * Resets consecutiveOverrunCount to 0 so the user is not nagged repeatedly.
     */
    acceptCalibration: (subject) => {
        const key = (subject || 'General').trim().toLowerCase();
        return queue.then(async () => {
            const doc = await loadIntelligenceDoc();
            const record = doc.learningBaselines[key];
            if (record) {
                record.consecutiveOverrunCount = 0; // Reset counter upon user calibration
                record.lastActionStatus = 'ACCEPTED';
                record.lastActionAtSessionCount = record.sessionCount;
                record.lastCalibratedAtUtc = new Date().toISOString();
                record.shouldSuggestCalibration = false;
            }
            const pendingSug = doc.adaptiveSuggestions.find(s => s.subjectKey === key && s.status === 'PENDING');
            if (pendingSug) {
                pendingSug.status = 'ACCEPTED';
                pendingSug.resolvedAtUtc = new Date().toISOString();
            }
            await saveIntelligenceDoc(doc);
            return record;
        });
    },

    /**
     * Dismisses a calibration suggestion, suppressing repeat prompts for 4 sessions.
     */
    dismissCalibration: (subject) => {
        const key = (subject || 'General').trim().toLowerCase();
        return queue.then(async () => {
            const doc = await loadIntelligenceDoc();
            const record = doc.learningBaselines[key];
            if (record) {
                record.lastActionStatus = 'DISMISSED';
                record.lastActionAtSessionCount = record.sessionCount;
                record.suppressUntilSessionCount = (record.sessionCount || 0) + 4;
                record.lastDismissedAtUtc = new Date().toISOString();
                record.shouldSuggestCalibration = false;
            }
            const pendingSug = doc.adaptiveSuggestions.find(s => s.subjectKey === key && s.status === 'PENDING');
            if (pendingSug) {
                pendingSug.status = 'DISMISSED';
                pendingSug.resolvedAtUtc = new Date().toISOString();
            }
            await saveIntelligenceDoc(doc);
            return record;
        });
    },

    /**
     * Returns the calibrated estimate for a planned duration based on learned bias.
     */
    getCalibratedEstimate: async (subject, plannedMinutes) => {
        const key = (subject || 'General').trim().toLowerCase();
        const doc = await loadIntelligenceDoc();
        const record = doc.learningBaselines[key];
        const bias = record?.biasFactor ?? 1.0;
        return Math.round(plannedMinutes * bias);
    },

    /**
     * Loads all active baseline records.
     */
    getBaselines: async () => {
        const doc = await loadIntelligenceDoc();
        return doc.learningBaselines;
    },

    /**
     * Loads all adaptive suggestions with their status (PENDING / ACCEPTED / DISMISSED).
     */
    getSuggestions: async () => {
        const doc = await loadIntelligenceDoc();
        return doc.adaptiveSuggestions || [];
    },

    /**
     * Resets calibration for a subject.
     */
    resetSubject: (subject) => {
        const key = (subject || 'General').trim().toLowerCase();
        return queue.then(async () => {
            const doc = await loadIntelligenceDoc();
            delete doc.learningBaselines[key];
            doc.adaptiveSuggestions = doc.adaptiveSuggestions.filter(s => s.subjectKey !== key);
            await saveIntelligenceDoc(doc);
            return true;
        });
    }
};
