import {StorageService} from '../storage.js';
import {TodoService} from '../todos.js';
import {PLANNER_STORAGE_KEY, emptyPlanner, validatePlanner, validateBlock, conflictsFor} from './plannerContracts.js';
let queue = Promise.resolve(); let sequence = 0;
const clone = value => JSON.parse(JSON.stringify(value));
async function read() { const saved = await StorageService.load(PLANNER_STORAGE_KEY, null, {strict: true}); return clone(validatePlanner(saved === null ? emptyPlanner() : saved)); }
function mutate(work) { const result = queue.then(async () => { const data = await read(); const next = await work(data); validatePlanner(next); const saved = await StorageService.save(PLANNER_STORAGE_KEY, next, {atomic: true}); if (!saved?.success) throw new Error('The plan could not be saved. Keep your changes and retry.'); return clone(next); }); queue = result.catch(() => {}); return result; }
export const PlannerService = {
    newBlockId: () => `block-${Date.now().toString(36)}-${(++sequence).toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    load: async () => { await queue; return read(); },
    saveBlock: (block, {allowConflict = false, expectedStartUtc = null} = {}) => mutate(async data => {
        validateBlock(block);
        if (!block.isBreak) {
            const tasks = await TodoService.getTodos(), task = tasks.find(t => t.id === block.taskRef.id);
            if (!task) throw new Error('This task is unavailable. Refresh tasks before planning it.');
            if (task.status === 'completed') throw new Error('This task is complete. Reopen it in Tasks before planning more time.');
        }
        const current = data.blocks.find(b => b.id === block.id);
        if (expectedStartUtc !== null && (!current || current.startUtc !== expectedStartUtc)) throw new Error('This block changed. Reload before editing.');
        if (!allowConflict && conflictsFor(block, data.blocks).length) throw new Error('This time overlaps another block. Choose another time or allow overlap.');
        return {...data, blocks: [...data.blocks.filter(b => b.id !== block.id), clone(block)]};
    }),
    replaceBlocks: (blocksToReplace = [], newBlocks = []) => mutate(async data => {
        newBlocks.forEach(validateBlock);
        const replaceIds = new Set((blocksToReplace || []).map(b => b.id));
        const remaining = data.blocks.filter(b => !replaceIds.has(b.id));
        return {...data, blocks: [...remaining, ...clone(newBlocks)]};
    }),
    removeBlock: id => mutate(data => ({...data, blocks: data.blocks.filter(b => b.id !== id)})),
    updateSettings: changes => mutate(data => ({...data, settings: {...data.settings, ...changes}}))
};
