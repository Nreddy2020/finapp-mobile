import { RateLimitService } from './rateLimit';
import { DeviceService } from './device';

// Risk Thresholds
const THRESHOLDS = {
    LOW: 20,
    MEDIUM: 50,
    HIGH: 80
};

export const RiskService = {

    /**
     * Evaluate Transaction Risk
     * @param {object} transaction - { amount, category, currency }
     * @param {object} userContext - { userId, deviceId }
     */
    evaluateTransaction: async (transaction, userContext = {}) => {
        let riskScore = 0;
        const reasons = [];

        // 1. Velocity Check (Spam Prevention)
        // Limit: 5 transactions per minute
        const isWithinLimit = await RateLimitService.checkLimit('tx_velocity', 5, 60);
        if (!isWithinLimit) {
            riskScore += 100;
            reasons.push('VELOCITY_EXCEEDED');
            return { decision: 'BLOCK', score: riskScore, reasons };
        }

        // 2. High Value Check
        // Threshold: 100,000 (Mock currency)
        if (parseFloat(transaction.amount) > 100000) {
            riskScore += 40;
            reasons.push('HIGH_VALUE');
        } else if (parseFloat(transaction.amount) > 50000) {
            riskScore += 20;
            reasons.push('SIGNIFICANT_VALUE');
        }

        // 3. Device Integrity Check (Mocked "New Device")
        // In real app, we check if device ID is seen before. 
        // Here, we trust the current device but if it changed recently it increases risk.
        const currentDeviceId = await DeviceService.getDeviceId();
        // If we had a history of trusted devices, we would check here.
        // Mock: If device ID length is odd (random logic for demo), flag it lightly.
        // Real: check "trusted_devices" list in storage.

        // 4. Anomaly Check (Category)
        if (transaction.category === 'Crypto' || transaction.category === 'Gambling') {
            riskScore += 30;
            reasons.push('HIGH_RISK_CATEGORY');
        }

        // DECISION LOGIC
        let decision = 'ALLOW';
        if (riskScore >= THRESHOLDS.HIGH) {
            decision = 'BLOCK';
        } else if (riskScore >= THRESHOLDS.MEDIUM) {
            decision = 'CHALLENGE'; // e.g. Require PIN
        }

        return {
            decision,
            score: riskScore,
            reasons
        };
    }
};
