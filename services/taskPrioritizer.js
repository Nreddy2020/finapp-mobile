// Smart Task Prioritization Engine
// AI-powered system to prioritize tasks based on financial impact, urgency, and skill development

class TaskPrioritizer {
    constructor() {
        this.financialImpactScores = {
            'very_high': 40,  // Can increase income significantly (₹10K+/month)
            'high': 30,       // Can save/earn money (₹5K+/month)
            'medium': 15,     // Indirect financial benefit
            'low': 5,         // Minimal financial impact
            'none': 0         // No financial impact
        };

        this.categoryScores = {
            'financial_improvement': 15,  // Directly improves finances
            'skill_development': 20,      // Leads to career growth
            'career_advancement': 18,     // Promotion, new job
            'health': 10,                 // Important but not urgent
            'entertainment': 0,           // Low priority
            'other': 5
        };
    }

    // Main prioritization function
    prioritizeTasks(tasks) {
        const scoredTasks = tasks.map(task => ({
            ...task,
            priority_score: this.calculatePriorityScore(task),
            priority_level: this.getPriorityLevel(task),
            recommended_time: this.getRecommendedTime(task),
            reason: this.getPriorityReason(task)
        }));

        // Sort by priority score (highest first)
        return scoredTasks.sort((a, b) => b.priority_score - a.priority_score);
    }

    calculatePriorityScore(task) {
        let score = 0;

        // 1. Financial Impact (40% weight)
        score += this.financialImpactScores[task.financial_impact] || 0;

        // 2. Urgency based on deadline (30% weight)
        score += this.calculateUrgencyScore(task.deadline);

        // 3. Category importance (20% weight)
        score += this.categoryScores[task.category] || 0;

        // 4. Quick wins bonus (10% weight)
        score += this.calculateQuickWinScore(task.time_required);

        // 5. Skill development multiplier
        if (task.category === 'skill_development' && task.financial_impact === 'high') {
            score *= 1.2; // 20% bonus for high-value skills
        }

        return Math.min(100, Math.round(score));
    }

    calculateUrgencyScore(deadline) {
        if (!deadline) return 0;

        const daysUntilDeadline = this.getDaysUntil(deadline);

        if (daysUntilDeadline <= 1) return 30;      // Today/Tomorrow - CRITICAL
        if (daysUntilDeadline <= 3) return 25;      // This week - URGENT
        if (daysUntilDeadline <= 7) return 20;      // Next week - Important
        if (daysUntilDeadline <= 30) return 10;     // This month - Plan ahead
        if (daysUntilDeadline <= 90) return 5;      // This quarter - Low urgency
        return 0;
    }

    calculateQuickWinScore(timeRequired) {
        const timeMap = {
            'minutes': 10,    // Can finish quickly
            'hours': 5,       // Half-day task
            'days': 2,        // Multi-day task
            'weeks': 0,       // Long-term project
            'months': 0
        };

        return timeMap[timeRequired] || 0;
    }

    getPriorityLevel(task) {
        const score = this.calculatePriorityScore(task);

        if (score >= 80) return 'CRITICAL';
        if (score >= 60) return 'HIGH';
        if (score >= 40) return 'MEDIUM';
        if (score >= 20) return 'LOW';
        return 'OPTIONAL';
    }

    getRecommendedTime(task) {
        const energyMap = {
            'high': 'Morning (7-11 AM)',
            'medium': 'Afternoon (1-5 PM)',
            'low': 'Evening (6-9 PM)'
        };

        return energyMap[task.energy_level] || 'Flexible';
    }

    getPriorityReason(task) {
        const reasons = [];

        // Financial impact
        if (task.financial_impact === 'very_high') {
            reasons.push('Very high financial impact');
        } else if (task.financial_impact === 'high') {
            reasons.push('High financial impact');
        }

        // Urgency
        const daysLeft = this.getDaysUntil(task.deadline);
        if (daysLeft <= 3) {
            reasons.push('Urgent deadline');
        } else if (daysLeft <= 7) {
            reasons.push('Deadline approaching');
        }

        // Category
        if (task.category === 'skill_development') {
            reasons.push('Skill development');
        } else if (task.category === 'financial_improvement') {
            reasons.push('Financial improvement');
        }

        // Quick win
        if (task.time_required === 'minutes') {
            reasons.push('Quick win');
        }

        return reasons.join(' + ') || 'Standard priority';
    }

    getDaysUntil(deadline) {
        if (!deadline) return Infinity;
        const deadlineDate = new Date(deadline);
        const today = new Date();
        const diffTime = deadlineDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }

    // Generate daily recommendations
    generateDailyRecommendations(tasks, userContext) {
        const recommendations = [];

        // Critical tasks first
        const criticalTasks = tasks.filter(t => this.getPriorityLevel(t) === 'CRITICAL');
        if (criticalTasks.length > 0) {
            recommendations.push({
                type: 'critical',
                title: 'Do This First!',
                task: criticalTasks[0],
                message: `Start with "${criticalTasks[0].title}" - ${criticalTasks[0].reason}`,
                time_slot: '7:00-9:00 AM'
            });
        }

        // Financial improvement
        const financialTasks = tasks.filter(t =>
            t.category === 'financial_improvement' &&
            t.financial_impact === 'very_high'
        );
        if (financialTasks.length > 0) {
            recommendations.push({
                type: 'financial',
                title: 'Increase Income Today',
                task: financialTasks[0],
                message: `"${financialTasks[0].title}" can increase your income`,
                potential_impact: financialTasks[0].potential_income || '₹10,000+/month'
            });
        }

        // Skill development
        const skillTasks = tasks.filter(t => t.category === 'skill_development');
        if (skillTasks.length > 0) {
            recommendations.push({
                type: 'learning',
                title: 'Learn & Grow',
                task: skillTasks[0],
                message: `Invest in yourself: "${skillTasks[0].title}"`,
                time_slot: '1:00-3:00 PM'
            });
        }

        // Quick wins
        const quickTasks = tasks.filter(t => t.time_required === 'minutes');
        if (quickTasks.length > 0) {
            recommendations.push({
                type: 'quick_win',
                title: 'Quick Wins',
                tasks: quickTasks.slice(0, 3),
                message: `Complete ${quickTasks.length} quick tasks in 30 minutes`,
                time_slot: '3:00-3:30 PM'
            });
        }

        return recommendations;
    }

    // Break down large tasks
    breakDownTask(task) {
        if (task.time_required === 'weeks' || task.time_required === 'months') {
            return {
                ...task,
                subtasks: this.generateSubtasks(task),
                daily_commitment: this.calculateDailyCommitment(task)
            };
        }
        return task;
    }

    generateSubtasks(task) {
        // AI-generated subtasks based on task type
        const subtaskTemplates = {
            'skill_development': [
                'Research and choose learning resource (30 min)',
                'Complete first lesson/chapter (1 hour)',
                'Practice exercises (1 hour)',
                'Build small project (2 hours)',
                'Review and consolidate (30 min)'
            ],
            'financial_improvement': [
                'Research opportunities (1 hour)',
                'Prepare application/proposal (2 hours)',
                'Submit applications (1 hour)',
                'Follow up (30 min)',
                'Track results (15 min)'
            ],
            'career_advancement': [
                'Update resume/portfolio (2 hours)',
                'Research companies (1 hour)',
                'Network and connect (1 hour)',
                'Apply for positions (2 hours)',
                'Prepare for interviews (2 hours)'
            ]
        };

        return subtaskTemplates[task.category] || [
            'Plan the task (15 min)',
            'Start execution (1 hour)',
            'Continue work (2 hours)',
            'Review progress (15 min)',
            'Complete and verify (30 min)'
        ];
    }

    calculateDailyCommitment(task) {
        const timeMap = {
            'weeks': '1-2 hours/day',
            'months': '30-60 min/day'
        };
        return timeMap[task.time_required] || '1 hour/day';
    }
}

export default new TaskPrioritizer();
