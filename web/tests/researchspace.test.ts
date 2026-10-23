import assert from 'node:assert/strict';
import {test} from 'node:test';
import {seed,normalizeState,addTaskCategory,retireTaskCategory,categoriesForDate} from '../lib/model.ts';
import {normalizeFormula,splitMath} from '../lib/math.ts';
import katex from 'katex';

test('old saved workspaces gain category IDs without changing tasks or creating duplicate categories',()=>{
 const old:any=seed();delete old.taskCategories;old.tasks.forEach((t:any)=>delete t.categoryId);
 const restored=normalizeState(old);assert.equal(restored.taskCategories.length,4);
 assert.ok(restored.tasks.every(t=>t.categoryId));
 assert.deepEqual(restored.tasks.map(({categoryId,...t})=>t),old.tasks);
});
test('adding categories affects today onward, including days with no tasks',()=>{
 const state=seed();const category=addTaskCategory(state,'论文阅读','2026-10-18');
 assert.ok(!categoriesForDate(state,'2026-10-17').some(c=>c.id===category.id));
 assert.ok(categoriesForDate(state,'2026-10-18').some(c=>c.id===category.id));
 assert.ok(categoriesForDate(state,'2026-10-19').some(c=>c.id===category.id));
 assert.throws(()=>addTaskCategory(state,'论文阅读','2026-10-18'));
});
test('deletion preserves historical tasks byte for byte and moves today/future tasks only',()=>{
 const state=seed(),base=state.tasks[0];const c=state.taskCategories[0];
 state.tasks=[{...base,id:'past',date:'2026-10-17'},{...base,id:'today',date:'2026-10-18'},{...base,id:'future',date:'2026-10-19'},{...base,id:'other',category:'科研',categoryId:'category-1',date:'2026-10-19'}];
 const past=JSON.stringify(state.tasks[0]),other=JSON.stringify(state.tasks[3]);
 assert.equal(retireTaskCategory(state,c.id,'2026-10-18'),2);
 assert.equal(JSON.stringify(state.tasks[0]),past);assert.equal(JSON.stringify(state.tasks[3]),other);
 for(const t of state.tasks.slice(1,3)){assert.equal(t.category,'未分类');assert.equal(t.categoryId,'uncategorized');assert.equal(t.status,base.status);}
 assert.ok(categoriesForDate(state,'2026-10-17').some(x=>x.id===c.id));
 assert.ok(!categoriesForDate(state,'2026-10-18').some(x=>x.id===c.id));
 assert.ok(!categoriesForDate(state,'2026-10-19').some(x=>x.id===c.id));
 const readded=addTaskCategory(state,c.name,'2026-10-18');assert.notEqual(readded.id,c.id);
 assert.ok(!categoriesForDate(state,'2026-10-17').some(x=>x.id===readded.id));
});
test('old clients and backups cannot reintroduce retired categories into future tasks',()=>{
 const state=seed(),category=state.taskCategories[0];category.retiredOn='2026-10-18';
 state.tasks=[{...state.tasks[0],date:'2026-10-17'},{...state.tasks[0],id:'later',date:'2026-10-19'}];
 const restored=normalizeState(state);assert.equal(restored.tasks[0].category,category.name);assert.equal(restored.tasks[1].category,'未分类');
});
test('legacy KL, cross entropy, inline application and delimited LaTeX render as math',()=>{
 const state=seed();for(const card of state.cards){assert.doesNotThrow(()=>katex.renderToString(normalizeFormula(card.formula),{throwOnError:true,trust:false}));}
 const parts=splitMath(state.cards[1].application);assert.equal(parts.filter(p=>p.math).length,1);
 assert.ok(katex.renderToString(parts.find(p=>p.math)!.text).includes('<math'));
 const custom=splitMath(String.raw`行内 \(x^2\)，独立 \[\frac{1}{2}\]。`);assert.equal(custom.filter(p=>p.math).length,2);assert.equal(custom.filter(p=>p.display).length,1);
 assert.equal(normalizeFormula(String.raw`\[x^2\]`),'x^2');
});
