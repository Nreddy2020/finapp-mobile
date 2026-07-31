import { StorageService, STORAGE_KEYS } from './storage';
import { mockCourses } from './mockData';

export const EducationService = {
    // Get all courses with user progress
    getCourses: async () => {
        const progressData = await StorageService.load(STORAGE_KEYS.EDUCATION_PROGRESS) || {};

        // Use centralized mock data
        const catalog = mockCourses;

        // Merge with progress
        return catalog.map(course => ({
            ...course,
            progress: progressData[course.id] || course.progress || 0, // Use stored progress or default from mock
        }));
    },

    // Update progress
    updateProgress: async (courseId, newProgress) => {
        const progressData = await StorageService.load(STORAGE_KEYS.EDUCATION_PROGRESS) || {};
        progressData[courseId] = newProgress;
        await StorageService.save(STORAGE_KEYS.EDUCATION_PROGRESS, progressData);
        return EducationService.getCourses();
    }
};
