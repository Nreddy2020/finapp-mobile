/**
 * services/time/priorityEngine.js
 *
 * Multi-factor composite priority ranking engine.
 * Calculates normalized scores P in [0, 100] with explicit sub-factor breakdown:
 *   Score = 35*Urgency + 25*Importance + 20*Difficulty + 10*Dependency + 10*GoalRelevance
 *
 * Guarantees:
 * - Intrinsic difficulty is decoupled from duration and estimate calibration.
 * - Overdue tasks bounded increment +0.05 * min(4, daysOverdue).
 * - Never returns NaN, null or scores outside [0, 100].
 */

export const PRIORITY_TIERS = {
    URGENT: 'Urgent',
    HIGH: 'High',
    MEDIUM: 'Medium',
    LOW: 'Low'
};

export function computeUrgency(deadline, nowMs = Date.now()) {
    if (!deadline) return 0.20; // Default baseline for un-dated tasks
    const targetMs = Date.parse(deadline);
    if (!Number.isFinite(targetMs)) return 0.20;

    const deltaMs = targetMs - nowMs;
    if (deltaMs >= 0) {
        // Not yet due: exponential decay towards deadline (tau = 48 hours)
        const tauMs = 48 * 3600 * 1000;
        return Math.exp(-deltaMs / tauMs);
    }

    // Overdue: base 1.0 + 0.05 per full 24h past deadline, capped at +0.20 (4 days)
    const overdueDays = Math.min(4, Math.floor(Math.abs(deltaMs) / (24 * 3600 * 1000)));
    return 1.0 + 0.05 * overdueDays;
}

export function calculatePriorityScore(task, { now = new Date().toISOString() } = {}) {
    const nowMs = typeof now === 'number' ? now : Date.parse(now);
    if (!Number.isFinite(nowMs)) {
        throw new Error(`Invalid 'now' timestamp provided: ${now}`);
    }

    // 1. Urgency (Weight = 35)
    const deadline = task.dueDate || task.deadline || null;
    const urgency = computeUrgency(deadline, nowMs);

    // 2. Importance (Weight = 25)
    let importance = 0.50; // Default
    if (typeof task.importance === 'number' && Number.isFinite(task.importance)) {
        importance = Math.max(0, Math.min(1, task.importance));
    } else if (task.priority === 'urgent' || task.priority === 'high') {
        importance = 0.85;
    } else if (task.priority === 'low') {
        importance = 0.25;
    }

    // 3. Intrinsic Difficulty (Weight = 20)
    // Strictly cognitive complexity, decoupled from duration or calibration
    let difficulty = 0.50;
    if (typeof task.cognitiveDifficulty === 'number' && Number.isFinite(task.cognitiveDifficulty)) {
        difficulty = Math.max(0, Math.min(1, task.cognitiveDifficulty));
    } else if (typeof task.difficulty === 'number' && Number.isFinite(task.difficulty)) {
        difficulty = Math.max(0, Math.min(1, task.difficulty));
    }

    // 4. Dependency (Weight = 10)
    const downstreamCount = Number.isInteger(task.downstreamTaskCount) ? task.downstreamTaskCount : (task.blocksOtherTasks ? 2 : 0);
    const dependency = Math.min(1.0, Math.max(0, 0.25 * downstreamCount));

    // 5. Goal Relevance (Weight = 10)
    let goalRelevance = 0.20; // Unlinked default
    if (task.goalId || task.goalRef) {
        goalRelevance = task.isCoreGoal ? 1.0 : 0.50;
    }

    const rawUrgency = 35 * urgency;
    const rawImportance = 25 * importance;
    const rawDifficulty = 20 * difficulty;
    const rawDependency = 10 * dependency;
    const rawGoalRelevance = 10 * goalRelevance;

    const totalRaw = rawUrgency + rawImportance + rawDifficulty + rawDependency + rawGoalRelevance;
    const score = Math.max(0, Math.min(100, Math.round(totalRaw)));

    let tier = PRIORITY_TIERS.LOW;
    if (score >= 85) tier = PRIORITY_TIERS.URGENT;
    else if (score >= 70) tier = PRIORITY_TIERS.HIGH;
    else if (score >= 50) tier = PRIORITY_TIERS.MEDIUM;

    // Largest-Remainder Method to guarantee sum(breakdown) === score unconditionally
    const rawItems = [
        { key: 'urgency', raw: rawUrgency, weight: 35 },
        { key: 'importance', raw: rawImportance, weight: 25 },
        { key: 'difficulty', raw: rawDifficulty, weight: 20 },
        { key: 'dependency', raw: rawDependency, weight: 10 },
        { key: 'goalRelevance', raw: rawGoalRelevance, weight: 10 }
    ];

    const breakdown = {
        urgency: 0,
        importance: 0,
        difficulty: 0,
        dependency: 0,
        goalRelevance: 0
    };

    if (score > 0 && totalRaw > 0) {
        let allocatedSum = 0;
        const itemsWithRemainder = rawItems.map(item => {
            const exactShare = (item.raw / totalRaw) * score;
            const baseFloor = Math.floor(exactShare);
            allocatedSum += baseFloor;
            return {
                key: item.key,
                floor: baseFloor,
                remainder: exactShare - baseFloor,
                weight: item.weight
            };
        });

        let deficit = score - allocatedSum;
        itemsWithRemainder.sort((a, b) => {
            if (Math.abs(b.remainder - a.remainder) > 1e-9) {
                return b.remainder - a.remainder;
            }
            return b.weight - a.weight;
        });

        for (const item of itemsWithRemainder) {
            const add = deficit > 0 ? 1 : 0;
            breakdown[item.key] = item.floor + add;
            if (deficit > 0) deficit--;
        }
    }

    return {
        score,
        tier,
        breakdown,
        normalizedFactors: {
            urgency,
            importance,
            difficulty,
            dependency,
            goalRelevance
        }
    };
}

export function rankTasks(tasks = [], context = {}) {
    return [...tasks]
        .map(task => ({ ...task, priorityEvaluation: calculatePriorityScore(task, context) }))
        .sort((a, b) => {
            if (b.priorityEvaluation.score !== a.priorityEvaluation.score) {
                return b.priorityEvaluation.score - a.priorityEvaluation.score;
            }
            // Secondary tiebreaker: earlier deadline first
            const deadA = Date.parse(a.dueDate || a.deadline || '9999-12-31');
            const deadB = Date.parse(b.dueDate || b.deadline || '9999-12-31');
            if (deadA !== deadB) return deadA - deadB;
            // Tertiary: id stability
            return String(a.id).localeCompare(String(b.id));
        });
}
