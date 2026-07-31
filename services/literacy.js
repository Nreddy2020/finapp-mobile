import { StorageService, STORAGE_KEYS } from './storage';

export const LiteracyService = {
    // Get content
    getContent: async () => {
        const scores = await StorageService.load(STORAGE_KEYS.LITERACY_SCORES) || {};

        return {
            articles: [
                { id: 'a1', title: '5 Rules of Thumb for Emergency Fund', readTime: '3 min' },
                { id: 'a2', title: 'Understanding Mutual Fund Fees', readTime: '5 min' }
            ],
            quizzes: [
                {
                    id: 'q1',
                    title: 'Savings Genius',
                    questions: 5,
                    bestScore: scores['q1'] || null
                },
                {
                    id: 'q2',
                    title: 'Risk Tolerance',
                    questions: 10,
                    bestScore: scores['q2'] || null
                }
            ]
        };
    },

    // Save quiz score
    saveScore: async (quizId, score) => {
        const scores = await StorageService.load(STORAGE_KEYS.LITERACY_SCORES) || {};
        // Only update if better or new
        if (!scores[quizId] || score > scores[quizId]) {
            scores[quizId] = score;
            await StorageService.save(STORAGE_KEYS.LITERACY_SCORES, scores);
        }
        return LiteracyService.getContent();
    }
};
