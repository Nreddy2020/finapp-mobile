import { StorageService, STORAGE_KEYS } from './storage';

export const TodoService = {
    getTodos: async () => {
        return await StorageService.load(STORAGE_KEYS.TODOS) || [];
    },

    addTodo: async (todo) => {
        const todos = await TodoService.getTodos();
        const newTodo = {
            id: Date.now().toString(),
            task: todo.task,
            deadline: todo.deadline || 'No Deadline',
            priority: todo.priority || 'normal', // 'high', 'normal'
            status: 'pending', // 'pending', 'completed'
            createdAt: new Date().toISOString()
        };
        const updated = [newTodo, ...todos];
        await StorageService.save(STORAGE_KEYS.TODOS, updated);
        return updated;
    },

    toggleStatus: async (id) => {
        const todos = await TodoService.getTodos();
        const updated = todos.map(t =>
            t.id === id ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } : t
        );
        await StorageService.save(STORAGE_KEYS.TODOS, updated);
        return updated;
    },

    deleteTodo: async (id) => {
        const todos = await TodoService.getTodos();
        const updated = todos.filter(t => t.id !== id);
        await StorageService.save(STORAGE_KEYS.TODOS, updated);
        return updated;
    }
};
