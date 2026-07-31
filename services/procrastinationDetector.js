// Procrastination Detector
// Identifies when users are wasting time or avoiding important tasks

class ProcrastinationDetector {
    constructor() {
        this.patterns = {
            longPending: {
                threshold: 7, // days
                severity: 'warning'
            },
            deadlineNear: {
                threshold: 3, // days
                severity: 'critical'
            },
            avoidingImportant: {
                avgPriorityThreshold: 40,
                severity: 'warning'
            },
            timeWasting: {
                ratio: 1.0, // entertainment/productive
                severity: 'warning'
            }
        };
    }

    // Main detection function
    detectProcrastination(user) {
        const alerts = [];

        // Pattern 1: Tasks pending too long
        alerts.push(...this.detectLongPendingTasks(user.tasks));

        // Pattern 2: Deadline approaching
        alerts.push(...this.detectDeadlineAlerts(user.tasks));

        // Pattern 3: Avoiding high-value tasks
        const avoidanceAlert = this.detectTaskAvoidance(user.activity);
        if (avoidanceAlert) alerts.push(avoidanceAlert);

        // Pattern 4: Time wasting
        const timeWasteAlert = this.detectTimeWasting(user.activity);
        if (timeWasteAlert) alerts.push(timeWasteAlert);

        // Pattern 5: Analysis paralysis
        const paralysisAlert = this.detectAnalysisParalysis(user.tasks);
        if (paralysisAlert) alerts.push(paralysisAlert);

        return {
            alerts,
            procrastination_score: this.calculateProcrastinationScore(alerts),
            recommendations: this.generateRecommendations(alerts)
        };
    }

    detectLongPendingTasks(tasks) {
        const alerts = [];
        const now = new Date();

        for (const task of tasks) {
            if (task.status !== 'pending') continue;

            const createdDate = new Date(task.created_at);
            const daysPending = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));

            if (daysPending >= this.patterns.longPending.threshold) {
                alerts.push({
                    type: 'long_pending',
                    severity: daysPending >= 14 ? 'critical' : 'warning',
                    task: task.title,
                    message: `"${task.title}" has been pending for ${daysPending} days!`,
                    days_pending: daysPending,
                    action: this.getActionForLongPending(task, daysPending),
                    icon: '⚠️'
                });
            }
        }

        return alerts;
    }

    detectDeadlineAlerts(tasks) {
        const alerts = [];
        const now = new Date();

        for (const task of tasks) {
            if (!task.deadline || task.status === 'completed') continue;

            const deadline = new Date(task.deadline);
            const daysLeft = Math.floor((deadline - now) / (1000 * 60 * 60 * 24));

            if (daysLeft <= this.patterns.deadlineNear.threshold && daysLeft >= 0) {
                alerts.push({
                    type: 'deadline_near',
                    severity: daysLeft <= 1 ? 'critical' : 'warning',
                    task: task.title,
                    message: `URGENT: Only ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left for "${task.title}"!`,
                    days_left: daysLeft,
                    action: this.getActionForDeadline(task, daysLeft),
                    icon: '🚨'
                });
            } else if (daysLeft < 0) {
                alerts.push({
                    type: 'deadline_missed',
                    severity: 'critical',
                    task: task.title,
                    message: `OVERDUE: "${task.title}" deadline passed ${Math.abs(daysLeft)} days ago!`,
                    days_overdue: Math.abs(daysLeft),
                    action: 'Complete this immediately or reschedule',
                    icon: '❌'
                });
            }
        }

        return alerts;
    }

    detectTaskAvoidance(activity) {
        if (!activity || !activity.completed_tasks || activity.completed_tasks.length === 0) {
            return null;
        }

        const completedTasks = activity.completed_tasks;
        const avgPriority = completedTasks.reduce((sum, t) => sum + (t.priority_score || 0), 0) / completedTasks.length;

        if (avgPriority < this.patterns.avoidingImportant.avgPriorityThreshold) {
            return {
                type: 'avoiding_important',
                severity: 'warning',
                message: 'You\'re avoiding important tasks!',
                details: `Average priority of completed tasks: ${Math.round(avgPriority)}/100`,
                action: 'Do the hardest task FIRST thing tomorrow morning',
                icon: '⚠️',
                recommendation: 'Focus on high-priority items (80+ score)'
            };
        }

        return null;
    }

    detectTimeWasting(activity) {
        if (!activity || !activity.time_spent) {
            return null;
        }

        const entertainmentTime = activity.time_spent.entertainment || 0;
        const productiveTime = (activity.time_spent.work || 0) +
            (activity.time_spent.learning || 0) +
            (activity.time_spent.side_project || 0);

        const ratio = productiveTime > 0 ? entertainmentTime / productiveTime : Infinity;

        if (ratio > this.patterns.timeWasting.ratio) {
            return {
                type: 'time_wasting',
                severity: ratio > 2 ? 'critical' : 'warning',
                message: 'More time on entertainment than productive work!',
                details: `Entertainment: ${entertainmentTime}h, Productive: ${productiveTime}h`,
                action: 'Set 30-minute timer for entertainment, then switch to work',
                icon: '⏰',
                recommendation: 'Limit entertainment to 1 hour/day during weekdays'
            };
        }

        return null;
    }

    detectAnalysisParalysis(tasks) {
        // Detect if user has many tasks but hasn't started any
        const pendingTasks = tasks.filter(t => t.status === 'pending');
        const inProgressTasks = tasks.filter(t => t.status === 'in_progress');

        if (pendingTasks.length >= 10 && inProgressTasks.length === 0) {
            return {
                type: 'analysis_paralysis',
                severity: 'warning',
                message: `You have ${pendingTasks.length} tasks but haven't started any!`,
                details: 'Stop planning, start doing',
                action: 'Pick ONE task and work on it for 15 minutes NOW',
                icon: '🤔',
                recommendation: 'Start with the highest priority task'
            };
        }

        return null;
    }

    getActionForLongPending(task, daysPending) {
        if (daysPending >= 30) {
            return 'Either do it NOW or delete it - it\'s not important';
        } else if (daysPending >= 14) {
            return 'Break into smaller tasks and start with 15 minutes today';
        } else {
            return 'Schedule 30 minutes tomorrow morning for this';
        }
    }

    getActionForDeadline(task, daysLeft) {
        if (daysLeft === 0) {
            return 'Block next 4 hours NOW to complete this';
        } else if (daysLeft === 1) {
            return 'Block next 2 hours TODAY to work on this';
        } else {
            return `Allocate ${Math.ceil(8 / daysLeft)} hours/day until deadline`;
        }
    }

    calculateProcrastinationScore(alerts) {
        // 0-100 score (higher = more procrastination)
        let score = 0;

        for (const alert of alerts) {
            if (alert.severity === 'critical') score += 30;
            else if (alert.severity === 'warning') score += 15;
        }

        return Math.min(100, score);
    }

    generateRecommendations(alerts) {
        const recommendations = [];

        // Group by type
        const types = [...new Set(alerts.map(a => a.type))];

        for (const type of types) {
            const typeAlerts = alerts.filter(a => a.type === type);

            switch (type) {
                case 'long_pending':
                    recommendations.push({
                        title: 'Clear Pending Tasks',
                        priority: 'high',
                        actions: [
                            'Review all pending tasks',
                            'Delete tasks you won\'t do',
                            'Start the most important one TODAY',
                            'Break large tasks into 15-minute chunks'
                        ]
                    });
                    break;

                case 'deadline_near':
                    recommendations.push({
                        title: 'Handle Urgent Deadlines',
                        priority: 'critical',
                        actions: [
                            'Block calendar for urgent tasks',
                            'Say NO to new commitments',
                            'Work in focused 2-hour blocks',
                            'Ask for help if needed'
                        ]
                    });
                    break;

                case 'avoiding_important':
                    recommendations.push({
                        title: 'Do Important Work First',
                        priority: 'high',
                        actions: [
                            'Identify your #1 priority',
                            'Do it FIRST thing tomorrow (7-9 AM)',
                            'No email/social media before completing it',
                            'Reward yourself after completion'
                        ]
                    });
                    break;

                case 'time_wasting':
                    recommendations.push({
                        title: 'Reduce Time Wasting',
                        priority: 'high',
                        actions: [
                            'Set app time limits (1 hour/day)',
                            'Use website blockers during work hours',
                            'Schedule entertainment time (9-10 PM)',
                            'Replace scrolling with reading/learning'
                        ]
                    });
                    break;

                case 'analysis_paralysis':
                    recommendations.push({
                        title: 'Stop Planning, Start Doing',
                        priority: 'critical',
                        actions: [
                            'Pick ONE task right now',
                            'Set 15-minute timer',
                            'Just start - don\'t overthink',
                            'Progress > Perfection'
                        ]
                    });
                    break;
            }
        }

        return recommendations;
    }

    // Get motivational intervention
    getMotivationalIntervention(alert) {
        const interventions = {
            long_pending: [
                "Every day you delay costs you opportunities.",
                "The best time to start was yesterday. The next best time is NOW.",
                "Small progress daily beats perfect plans never executed."
            ],
            deadline_near: [
                "Pressure creates diamonds. You can do this!",
                "Focus mode: Block everything else and FINISH THIS.",
                "Your future self will thank you for acting NOW."
            ],
            avoiding_important: [
                "Easy tasks feel good. Important tasks CHANGE YOUR LIFE.",
                "Do the hard thing first. Everything else becomes easier.",
                "High-value work = High-value results."
            ],
            time_wasting: [
                "Netflix will still be there. Your dreams won't wait.",
                "Every hour wasted is ₹500 not earned.",
                "Successful people delay gratification."
            ],
            analysis_paralysis: [
                "Done is better than perfect.",
                "You don't need more information. You need ACTION.",
                "15 minutes of doing > 15 hours of planning."
            ]
        };

        const messages = interventions[alert.type] || ["Take action NOW!"];
        return messages[Math.floor(Math.random() * messages.length)];
    }
}

export default new ProcrastinationDetector();
