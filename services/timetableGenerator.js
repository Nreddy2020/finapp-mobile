// Perfect Timetable Generator
// Creates optimized daily schedules based on task priorities and user energy levels

class TimetableGenerator {
    constructor() {
        this.timeSlots = {
            morning: {
                start: '7:00',
                end: '12:00',
                energy: 'high',
                best_for: ['critical', 'high_priority', 'deep_work']
            },
            afternoon: {
                start: '13:00',
                end: '17:00',
                energy: 'medium',
                best_for: ['learning', 'meetings', 'collaboration']
            },
            evening: {
                start: '18:00',
                end: '21:00',
                energy: 'low',
                best_for: ['creative', 'side_projects', 'review']
            },
            night: {
                start: '21:00',
                end: '23:00',
                energy: 'rest',
                best_for: ['relaxation', 'planning']
            }
        };
    }

    // Generate perfect daily schedule
    generateDailySchedule(tasks, userPreferences = {}) {
        const schedule = [];
        const prioritizedTasks = this.sortTasksByPriority(tasks);

        // Morning (7:00-12:00) - High Energy
        schedule.push(...this.allocateMorningSlots(prioritizedTasks));

        // Afternoon (13:00-17:00) - Medium Energy
        schedule.push(...this.allocateAfternoonSlots(prioritizedTasks));

        // Evening (18:00-21:00) - Low Energy
        schedule.push(...this.allocateEveningSlots(prioritizedTasks));

        // Night (21:00-23:00) - Rest & Planning
        schedule.push(...this.allocateNightSlots());

        return this.optimizeSchedule(schedule);
    }

    allocateMorningSlots(tasks) {
        const slots = [];

        // 7:00-8:00: Morning routine
        slots.push({
            time: '7:00-8:00',
            activity: 'Morning Routine',
            type: 'routine',
            description: 'Wake up, exercise, breakfast',
            energy_required: 'low',
            locked: true
        });

        // 8:00-10:00: CRITICAL task #1
        const criticalTask = tasks.find(t => t.priority_level === 'CRITICAL');
        if (criticalTask) {
            slots.push({
                time: '8:00-10:00',
                activity: criticalTask.title,
                type: 'work',
                priority: 'CRITICAL',
                task: criticalTask,
                description: criticalTask.description,
                energy_required: 'high',
                financial_impact: criticalTask.financial_impact,
                reason: 'Peak productivity time for critical tasks'
            });
        }

        // 10:00-12:00: HIGH priority task #2
        const highTask = tasks.find(t =>
            t.priority_level === 'HIGH' &&
            t.id !== criticalTask?.id
        );
        if (highTask) {
            slots.push({
                time: '10:00-12:00',
                activity: highTask.title,
                type: 'work',
                priority: 'HIGH',
                task: highTask,
                description: highTask.description,
                energy_required: 'high',
                financial_impact: highTask.financial_impact,
                reason: 'Still high energy for important work'
            });
        }

        return slots;
    }

    allocateAfternoonSlots(tasks) {
        const slots = [];

        // 12:00-13:00: Lunch break
        slots.push({
            time: '12:00-13:00',
            activity: 'Lunch Break',
            type: 'break',
            description: 'Lunch + rest',
            energy_required: 'none',
            locked: true
        });

        // 13:00-15:00: Learning/Skill development
        const learningTask = tasks.find(t => t.category === 'skill_development');
        if (learningTask) {
            slots.push({
                time: '13:00-15:00',
                activity: learningTask.title,
                type: 'learning',
                priority: learningTask.priority_level,
                task: learningTask,
                description: learningTask.description,
                energy_required: 'medium',
                reason: 'Good time for focused learning'
            });
        }

        // 15:00-17:00: Medium priority tasks
        const mediumTask = tasks.find(t =>
            t.priority_level === 'MEDIUM' &&
            t.category !== 'skill_development'
        );
        if (mediumTask) {
            slots.push({
                time: '15:00-17:00',
                activity: mediumTask.title,
                type: 'work',
                priority: 'MEDIUM',
                task: mediumTask,
                description: mediumTask.description,
                energy_required: 'medium'
            });
        }

        return slots;
    }

    allocateEveningSlots(tasks) {
        const slots = [];

        // 17:00-18:00: Break
        slots.push({
            time: '17:00-18:00',
            activity: 'Evening Break',
            type: 'break',
            description: 'Snack + refresh',
            energy_required: 'none',
            locked: true
        });

        // 18:00-20:00: Side projects / Financial improvement
        const sideProject = tasks.find(t =>
            t.category === 'financial_improvement' ||
            t.category === 'side_income'
        );
        if (sideProject) {
            slots.push({
                time: '18:00-20:00',
                activity: sideProject.title,
                type: 'side_project',
                priority: sideProject.priority_level,
                task: sideProject,
                description: sideProject.description,
                energy_required: 'low',
                financial_impact: sideProject.financial_impact,
                reason: 'Creative work in evening'
            });
        }

        // 20:00-21:00: Dinner + Family time
        slots.push({
            time: '20:00-21:00',
            activity: 'Dinner & Family',
            type: 'personal',
            description: 'Dinner + family time',
            energy_required: 'low',
            locked: true
        });

        return slots;
    }

    allocateNightSlots() {
        return [
            {
                time: '21:00-22:00',
                activity: 'Review & Plan',
                type: 'planning',
                description: 'Review today + plan tomorrow',
                energy_required: 'low',
                locked: true
            },
            {
                time: '22:00-23:00',
                activity: 'Relaxation',
                type: 'entertainment',
                description: 'Netflix, reading, or hobby',
                energy_required: 'none',
                locked: true,
                note: 'Earned reward time!'
            },
            {
                time: '23:00',
                activity: 'Sleep',
                type: 'rest',
                description: 'Sleep for recovery',
                energy_required: 'none',
                locked: true
            }
        ];
    }

    optimizeSchedule(schedule) {
        // Add buffer times
        const optimized = schedule.map(slot => ({
            ...slot,
            buffer_before: this.calculateBuffer(slot),
            tips: this.getProductivityTips(slot)
        }));

        // Calculate total productive hours
        const productiveHours = optimized
            .filter(s => s.type === 'work' || s.type === 'learning' || s.type === 'side_project')
            .reduce((sum, s) => sum + this.calculateDuration(s.time), 0);

        return {
            slots: optimized,
            summary: {
                total_productive_hours: productiveHours,
                critical_tasks: optimized.filter(s => s.priority === 'CRITICAL').length,
                high_priority_tasks: optimized.filter(s => s.priority === 'HIGH').length,
                learning_time: optimized.filter(s => s.type === 'learning').length * 2,
                break_time: optimized.filter(s => s.type === 'break').length,
                relaxation_time: 1
            }
        };
    }

    calculateBuffer(slot) {
        if (slot.type === 'work' && slot.priority === 'CRITICAL') {
            return '5 min - Deep breath, focus';
        }
        if (slot.type === 'learning') {
            return '5 min - Review previous lesson';
        }
        return '2 min - Quick stretch';
    }

    getProductivityTips(slot) {
        const tips = {
            work: [
                'Turn off phone notifications',
                'Use Pomodoro: 25 min work, 5 min break',
                'Close unnecessary tabs'
            ],
            learning: [
                'Take notes while learning',
                'Practice immediately after learning',
                'Teach someone to solidify knowledge'
            ],
            side_project: [
                'Set specific goal for session',
                'Track time spent',
                'Celebrate small wins'
            ]
        };

        return tips[slot.type] || [];
    }

    calculateDuration(timeSlot) {
        const [start, end] = timeSlot.split('-');
        const startHour = parseInt(start.split(':')[0]);
        const endHour = parseInt(end.split(':')[0]);
        return endHour - startHour;
    }

    sortTasksByPriority(tasks) {
        return tasks.sort((a, b) => {
            const priorityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1, 'OPTIONAL': 0 };
            return (priorityOrder[b.priority_level] || 0) - (priorityOrder[a.priority_level] || 0);
        });
    }

    // Generate weekly overview
    generateWeeklySchedule(tasks) {
        const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const weeklySchedule = {};

        weekDays.forEach(day => {
            weeklySchedule[day] = this.generateDailySchedule(tasks);
        });

        // Weekend adjustments
        weeklySchedule['Saturday'] = this.generateWeekendSchedule(tasks, 'Saturday');
        weeklySchedule['Sunday'] = this.generateWeekendSchedule(tasks, 'Sunday');

        return weeklySchedule;
    }

    generateWeekendSchedule(tasks, day) {
        // More flexible weekend schedule
        return {
            slots: [
                { time: '8:00-9:00', activity: 'Sleep in / Relax', type: 'rest' },
                { time: '9:00-10:00', activity: 'Breakfast', type: 'personal' },
                { time: '10:00-12:00', activity: 'Side project / Learning', type: 'learning' },
                { time: '12:00-13:00', activity: 'Lunch', type: 'break' },
                { time: '13:00-15:00', activity: 'Personal projects', type: 'side_project' },
                { time: '15:00-17:00', activity: 'Hobbies / Exercise', type: 'personal' },
                { time: '17:00-20:00', activity: 'Family / Social', type: 'personal' },
                { time: '20:00-23:00', activity: 'Entertainment / Relax', type: 'entertainment' }
            ],
            summary: {
                note: 'Weekend - Balance work and rest',
                productive_hours: 4,
                personal_time: 7
            }
        };
    }
}

export default new TimetableGenerator();
