import { StorageService, STORAGE_KEYS } from './storage';
import { isDate, text, money, integer } from './life/storeKit.js';
import { TASK_CATEGORIES, RECURRENCES, PRIORITIES, nextOccurrence } from './life/taskViews.js';

let pending=Promise.resolve();
let sequence=0;
const clone=value=>JSON.parse(JSON.stringify(value));
function serialize(work) { const result=pending.then(work);pending=result.catch(()=>{});return result; }
export function validateTodoRecords(rows) {
    if(!Array.isArray(rows)) throw new Error('Saved tasks could not be read. Retry without replacing them.');
    const ids=new Set();
    for(const task of rows) {
        const validId=task && ((typeof task.id==='string' && !!task.id) || (Number.isSafeInteger(task.id) && task.id>=0));
        if(!validId || (typeof task.task!=='string' && typeof task.title!=='string') || ids.has(String(task.id))) throw new Error('Saved tasks could not be read. Retry without replacing them.');
        ids.add(String(task.id));
    }
    return rows.map(row=>{
        const deadline=row.deadline ?? row.dueDate ?? 'No Deadline';
        return {...row,task:row.task ?? row.title,deadline,priority:row.priority ?? 'normal',status:row.status ?? (row.completed?'completed':'pending'),dueDate:isDate(row.dueDate)?row.dueDate:(isDate(deadline)?deadline:null)};
    });
}
async function read() { return clone(validateTodoRecords(await StorageService.load(STORAGE_KEYS.TODOS,[],{strict:true}))); }
async function save(rows) { const result=await StorageService.save(STORAGE_KEYS.TODOS,rows,{atomic:true});if(!result?.success)throw new Error('Tasks could not be saved. Your changes are still available to retry.');return clone(rows); }
function newTaskId(rows){let id;do{id=Date.now().toString(36)+'-'+(++sequence).toString(36)+'-'+Math.random().toString(36).slice(2,10);}while(rows.some(row=>row.id===id));return id;}
function goalRef(value){
    if(value===null||value===undefined||value==='')return null;
    if(!value||!['life','career','family'].includes(value.domain)||!((typeof value.id==='string'&&value.id)||Number.isSafeInteger(value.id)))throw new Error('Choose a valid goal to link.');
    return {domain:value.domain,id:value.id,...(value.householdId?{householdId:value.householdId}:{})};
}
function subtasks(list){
    if(!Array.isArray(list))throw new Error('Subtasks must be a list.');
    return list.map((item,index)=>({id:typeof item.id==='string'&&item.id?item.id:`sub-${Date.now().toString(36)}-${index}-${Math.random().toString(36).slice(2,8)}`,title:text(item.title,'a subtask title',{max:200}),done:!!item.done}));
}
/** Extended optional attributes. Only keys present in `input` are validated and returned. */
function extras(input){
    const out={};
    if(input.dueDate!==undefined){ if(input.dueDate===null||input.dueDate==='')out.dueDate=null; else { if(!isDate(input.dueDate))throw new Error('Enter a valid due date as YYYY-MM-DD.'); out.dueDate=input.dueDate; } }
    if(input.notes!==undefined)out.notes=text(input.notes,'notes',{max:2000,required:false});
    if(input.category!==undefined){ if(!TASK_CATEGORIES.includes(input.category))throw new Error('Choose a valid category.'); out.category=input.category; }
    if(input.goalRef!==undefined)out.goalRef=goalRef(input.goalRef);
    if(input.recurrence!==undefined){ if(!RECURRENCES.includes(input.recurrence))throw new Error('Choose a valid repeat option.'); out.recurrence=input.recurrence; }
    if(input.subtasks!==undefined)out.subtasks=subtasks(input.subtasks);
    if(input.amount!==undefined)out.amount=money(input.amount,'amount',{allowNull:true});
    if(input.estimatedMinutes!==undefined)out.estimatedMinutes=integer(input.estimatedMinutes,'Estimate',{min:1,max:1440,allowNull:true});
    if(input.reminderAt!==undefined){ if(input.reminderAt===null||input.reminderAt==='')out.reminderAt=null; else { if(!Number.isFinite(Date.parse(input.reminderAt)))throw new Error('Enter a valid reminder time.'); out.reminderAt=input.reminderAt; } }
    return out;
}
function fields(input) {
    const task=typeof input.task==='string'?input.task.trim():'';
    if(!task)throw new Error('Enter a task title.');
    if(task.length>500)throw new Error('Keep the task title within 500 characters.');
    if(input.priority && !PRIORITIES.includes(input.priority))throw new Error('Choose a valid priority.');
    const more=extras(input);
    if(more.recurrence&&more.recurrence!=='none'&&!more.dueDate)throw new Error('A repeating task needs a due date.');
    const deadline=input.deadline || more.dueDate || 'No Deadline';
    return {task,deadline,priority:input.priority || 'normal',...more};
}
export const TodoService = {
    getTodos:async()=>{await pending;return read();},
    addTodo:(input,{requestId=null}={})=>serialize(async()=>{
        const value=fields(input),rows=await read();
        if(requestId!==null && (typeof requestId!=='string'||!requestId))throw new Error('Invalid task request.');
        const existing=requestId&&rows.find(row=>row.creationRequestId===requestId);
        if(existing) {
            if(['task','deadline','priority'].some(key=>existing[key]!==value[key]))throw new Error('This task was already saved. Refresh before changing it.');
            return rows;
        }
        const id=newTaskId(rows);
        return save([{id,...value,status:'pending',createdAt:new Date().toISOString(),...(requestId?{creationRequestId:requestId}:{})},...rows]);
    }),
    setStatus:(id,status)=>serialize(async()=>{
        if(!['pending','completed'].includes(status))throw new Error('Invalid task status.');
        const rows=await read();if(!rows.some(row=>row.id===id))throw new Error('This task is no longer available. Refresh the list.');
        if(rows.find(row=>row.id===id).status===status)return rows;
        return save(rows.map(row=>row.id===id?{...row,status,...(status==='completed'?{completedAt:new Date().toISOString()}:{completedAt:null})}:row));
    }),
    updatePlanningDetails:(id,changes)=>serialize(async()=>{
        const rows=await read();if(!rows.some(row=>row.id===id))throw new Error('This task is no longer available. Refresh the list.');
        const updates={};
        if(changes.priority!==undefined){if(!['normal','high'].includes(changes.priority))throw new Error('Choose a valid priority.');updates.priority=changes.priority;}
        if(changes.estimatedMinutes!==undefined){if(!Number.isInteger(changes.estimatedMinutes)||changes.estimatedMinutes<1||changes.estimatedMinutes>1440)throw new Error('Estimate must be 1 to 1440 minutes.');updates.estimatedMinutes=changes.estimatedMinutes;}
        return save(rows.map(row=>row.id===id?{...row,...updates}:row));
    }),
    /** Edit any user-visible task attribute. Unknown legacy fields are preserved. */
    updateTodo:(id,changes)=>serialize(async()=>{
        const rows=await read();const current=rows.find(row=>row.id===id);if(!current)throw new Error('This task is no longer available. Refresh the list.');
        const updates={};
        if(changes.task!==undefined){const task=typeof changes.task==='string'?changes.task.trim():'';if(!task)throw new Error('Enter a task title.');if(task.length>500)throw new Error('Keep the task title within 500 characters.');updates.task=task;if(current.title!==undefined)updates.title=task;}
        if(changes.priority!==undefined){if(!PRIORITIES.includes(changes.priority))throw new Error('Choose a valid priority.');updates.priority=changes.priority;}
        Object.assign(updates,extras(changes));
        if(updates.dueDate!==undefined)updates.deadline=updates.dueDate||'No Deadline';
        else if(changes.deadline!==undefined)updates.deadline=changes.deadline||'No Deadline';
        const recurrence=updates.recurrence??current.recurrence??'none';const dueDate=updates.dueDate!==undefined?updates.dueDate:current.dueDate;
        if(recurrence!=='none'&&!dueDate)throw new Error('A repeating task needs a due date.');
        return save(rows.map(row=>row.id===id?{...row,...updates}:row));
    }),
    /** Marks complete; a repeating task also schedules its next occurrence as a new task. */
    completeTodo:(id)=>serialize(async()=>{
        const rows=await read();const current=rows.find(row=>row.id===id);if(!current)throw new Error('This task is no longer available. Refresh the list.');
        if(current.status==='completed')return rows;
        const completedAt=new Date().toISOString();
        const next=rows.map(row=>row.id===id?{...row,status:'completed',completedAt}:row);
        const recurrence=current.recurrence||'none';
        if(recurrence!=='none'&&current.dueDate&&!rows.some(row=>row.recurrenceParentId===(current.recurrenceParentId||current.id)&&row.status!=='completed'&&row.dueDate>current.dueDate)){
            const dueDate=nextOccurrence(current.dueDate,recurrence);
            const {id:_old,status:_s,completedAt:_c,createdAt:_a,creationRequestId:_r,...rest}=current;
            const occurrence={...rest,id:newTaskId(rows),task:current.task,deadline:dueDate,dueDate,status:'pending',completedAt:null,createdAt:completedAt,recurrenceParentId:current.recurrenceParentId||current.id,subtasks:(current.subtasks||[]).map(s=>({...s,done:false}))};
            next.unshift(occurrence);
        }
        return save(next);
    }),
    toggleSubtask:(id,subtaskId)=>serialize(async()=>{
        const rows=await read();const current=rows.find(row=>row.id===id);if(!current)throw new Error('This task is no longer available. Refresh the list.');
        const list=(current.subtasks||[]).map(s=>s.id===subtaskId?{...s,done:!s.done}:s);
        return save(rows.map(row=>row.id===id?{...row,subtasks:list}:row));
    }),
    toggleStatus:id=>serialize(async()=>{
        const rows=await read();if(!rows.some(row=>row.id===id))throw new Error('This task is no longer available. Refresh the list.');
        return save(rows.map(row=>row.id===id?{...row,status:row.status==='completed'?'pending':'completed',completedAt:row.status==='completed'?null:new Date().toISOString()}:row));
    }),
    deleteTodo:id=>serialize(async()=>{
        const rows=await read();if(!rows.some(row=>row.id===id))return rows;
        return save(rows.filter(row=>row.id!==id));
    })
};
