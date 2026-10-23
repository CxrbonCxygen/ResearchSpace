import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seed,stateSchema} from '../lib/model.ts';
import {syncRealProject,gsmRunKey,preserveRealProjectMetadata} from '../lib/real-projects.ts';
import type {TrainingRun} from '../lib/training-model.ts';
const sample=():TrainingRun=>({runKey:gsmRunKey,name:'GSM8K · 双卡 500 步训练',projectId:'dllm',dataset:'GSM8K',maxSteps:500,currentStep:500,historyStep:500,stage:'step-25-256',status:'evaluating',source:'现有日志',logPath:'/runs/'+gsmRunKey,observedAt:'2026-10-23T08:00:00Z',receivedAt:'2026-10-23T08:00:01Z',pointCount:2564,gpus:[],evaluations:[{name:'base-256',length:256,samples:1319,correct:1015,accuracy:1015/1319,seconds:11186},{name:'base-512',length:512,samples:1319,correct:1032,accuracy:1032/1319,seconds:37964}]});
test('replace demos using measured data only, retain all historical content and separate evaluation lengths',()=>{
 const state=seed(),tasks=structuredClone(state.tasks),cards=structuredClone(state.cards),old=structuredClone(state.projects[0]);
 assert.equal(syncRealProject(state,[]),false);assert.equal(syncRealProject(state,[sample()],.017),true);
 assert.deepEqual(state.tasks,tasks);assert.deepEqual(state.cards,cards);
 assert.deepEqual(state.projects.find(p=>p.id==='rf'),{...old,archived:true});
 assert.deepEqual(state.projects.filter(p=>!p.archived).map(p=>p.id),['dllm']);
 assert.equal(state.projects.find(p=>p.id==='dllm')?.baseline,1015/1319*100);
 const real=state.experiments.filter(e=>e.trainingRunKey);assert.equal(real.length,3);
 assert.notEqual(real[0].dataset,real[1].dataset);assert.equal(real[2].value,null);assert.equal(real[2].progressUnit,'Step');
 assert.equal(real[2].phase,'评测中');assert.equal(real[2].epoch,500);assert.ok(stateSchema.safeParse(state).success);
 assert.equal(syncRealProject(state,[sample()],.017),false);
});
test('new checkpoint evaluations update without duplicates or replacing researcher edits',()=>{
 const state=seed(),run=sample();syncRealProject(state,[run]);
 state.projects.find(p=>p.trainingSource)!.question='用户写的研究问题';
 run.evaluations.push({name:'step-25-256',length:256,samples:1319,correct:1020,accuracy:1020/1319,seconds:50});
 run.stage='step-50-256';run.observedAt='2026-10-23T08:05:00Z';syncRealProject(state,[run]);
 assert.equal(state.experiments.filter(e=>e.trainingRunKey).length,4);assert.equal(state.projects.find(p=>p.trainingSource)!.question,'用户写的研究问题');
 assert.equal(state.experiments.find(e=>e.name==='step-25-256')?.value,1020/1319*100);
 assert.equal(syncRealProject(state,[run]),false);
});
test('customized projects and unrelated workspaces are preserved',()=>{
 const state=seed();state.projects.find(p=>p.id==='dllm')!.demo=false;
 const original=structuredClone(state.projects.find(p=>p.id==='dllm'));
 syncRealProject(state,[sample()]);assert.deepEqual(state.projects.find(p=>p.id==='dllm'),original);
 assert.ok(state.projects.some(p=>p.id==='gsm8k-real'&&p.trainingSource===gsmRunKey));
 const noBaseline=sample();noBaseline.evaluations=[];const untouched=seed(),before=structuredClone(untouched);
 assert.equal(syncRealProject(untouched,[noBaseline]),false);assert.deepEqual(untouched,before);
});

test('an older APK saving a task cannot resurrect demos or restore its stale baseline',()=>{
 const previous=seed();syncRealProject(previous,[sample()]);const next=structuredClone(previous);
 for(const p of next.projects){delete p.trainingSource;delete p.archived;}
 for(const e of next.experiments){delete e.trainingRunKey;delete e.progressUnit;delete e.phase;}
 next.realProjectsVersion=0;next.projects.find(p=>p.id==='dllm')!.baseline=62.5;
 next.tasks[0].title='离线修改';preserveRealProjectMetadata(next,previous);
 assert.equal(next.projects.find(p=>p.id==='dllm')!.baseline,1015/1319*100);
 assert.equal(next.projects.find(p=>p.id==='rf')!.archived,true);assert.equal(next.tasks[0].title,'离线修改');
 assert.equal(next.realProjectsVersion,1);
});
