import {test} from 'node:test';
import assert from 'node:assert/strict';
import katex from 'katex';
import {emptyState,seed,cardSchema,normalizeState} from '../lib/model.ts';
import {foundationCards,installFoundationCards} from '../lib/foundation-cards.ts';
import {normalizeFormula} from '../lib/math.ts';
import {mergeStates} from '../lib/sync-merge.ts';
import {OfflineEngine,type RecordData} from '../mobile/engine.ts';

test('40 foundation cards have complete examples, valid formulas and HTTPS sources',()=>{
 assert.equal(foundationCards.length,40);
 assert.equal(new Set(foundationCards.map(c=>c.id)).size,40);
 assert.equal(new Set(foundationCards.map(c=>c.title)).size,40);
 for(const c of foundationCards){
  assert.ok(cardSchema.safeParse(c).success,c.title);
  for(const field of ['intuition','formula','example','code','application','related'] as const)assert.ok(c[field].trim(),c.title+': '+field);
  assert.ok(c.sources?.length,c.title);
  assert.doesNotThrow(()=>katex.renderToString(normalizeFormula(c.formula),{throwOnError:true,trust:false}),c.title);
 }
 assert.equal(seed().cards.length,46);
});

test('upgrading existing cards preserves edits, review progress and all other records',()=>{
 const state=seed();state.cards=state.cards.slice(0,6);state.knowledgeVersion=0;
 state.cards[0].intuition='我自己的理解';state.cards[0].reviews=99;state.cards[0].due='2027-01-01';
 const original=structuredClone(state);
 assert.equal(installFoundationCards(state),true);
 assert.deepEqual(state.cards.slice(0,6),original.cards);
 assert.deepEqual(state.tasks,original.tasks);assert.deepEqual(state.projects,original.projects);assert.deepEqual(state.experiments,original.experiments);
 state.cards.find(c=>c.id===foundationCards[0].id)!.example='自己改过的例子';
 state.cards=state.cards.filter(c=>c.id!==foundationCards[1].id);
 const after=structuredClone(state);assert.equal(installFoundationCards(state),false);assert.deepEqual(state,after);
});

test('custom cards with matching titles are retained and not duplicated',()=>{
 const state=emptyState();state.cards.push({...foundationCards[0],id:'my-card',reviews:3,intuition:'我的解释'});
 installFoundationCards(state);
 assert.equal(state.cards.length,40);assert.equal(state.cards[0].id,'my-card');assert.equal(state.cards[0].reviews,3);
 assert.ok(!state.cards.some(c=>c.id===foundationCards[0].id));
});

test('same library additions from offline and cloud merge without conflicts; deletions stay deleted',()=>{
 const base=emptyState(),local=structuredClone(base),remote=structuredClone(base);
 installFoundationCards(local);installFoundationCards(remote);
 const first=mergeStates(base,local,remote);assert.equal(first.conflicts.length,0);assert.equal(first.state.cards.length,40);
 const next=structuredClone(first.state);next.cards.shift();
 const second=mergeStates(first.state,next,first.state);
 assert.equal(second.conflicts.length,0);assert.equal(second.state.cards.length,39);assert.equal(second.state.knowledgeVersion,1);
 assert.equal(installFoundationCards(second.state),false);
});

test('offline upgrade is persisted before rendering and does not restore a card on restart',async()=>{
 let disk:RecordData={local:emptyState(),base:emptyState(),localRevision:7,cloudRevision:2,pending:false};
 const db={read:async()=>structuredClone(disk),write:async(r:RecordData)=>{disk=structuredClone(r);}},vault={get:async()=>'',set:async()=>{}};
 const engine=new OfflineEngine(db,vault,'https://cloud.example',()=>{});await engine.init();
 assert.equal(disk.local.cards.length,40);assert.equal(disk.localRevision,8);assert.equal(disk.pending,true);
 const current=await (await engine.transport('/api/state')).json() as any;current.state.cards.shift();
 await engine.transport('/api/state',{method:'PUT',body:JSON.stringify(current)});engine.destroy();
 const restarted=new OfflineEngine(db,vault,'https://cloud.example',()=>{});await restarted.init();assert.equal(restarted.snapshot().local.cards.length,39);restarted.destroy();
 const legacy:any=structuredClone(disk.local);delete legacy.knowledgeVersion;assert.equal(normalizeState(legacy).knowledgeVersion,0);
});
