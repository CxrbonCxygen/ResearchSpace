import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyState} from '../lib/model.ts';
import {OfflineEngine,type RecordData} from '../mobile/engine.ts';

test('training history survives offline restart and refreshes on reconnection without changing queued tasks',async()=>{
 let disk:RecordData={local:emptyState(),base:emptyState(),localRevision:4,cloudRevision:0,pending:true};
 let online=true,calls=0,value=.3;
 const points='/api/training?run=example-run';
 const request:typeof fetch=async(input,options)=>{calls++;assert.equal(new Headers(options?.headers).get('Authorization'),'Bearer '+'a'.repeat(64));if(!online)throw Error('offline');return Response.json(String(input).includes('?run=')?{points:[{step:1,metric:'loss',value}]}:{runs:[{runKey:'example-run',name:'test'}]});};
 const make=()=>new OfflineEngine({read:async()=>structuredClone(disk),write:async r=>{disk=structuredClone(r);}},{get:async()=>'a'.repeat(64),set:async()=>{}},'https://example.com',()=>{},request);
 let engine=make();await engine.init();const pending=engine.snapshot().pending,revision=engine.snapshot().localRevision;
 assert.equal((await engine.transport('/api/training')).status,200);
 const first=await (await engine.transport(points)).json();assert.equal(first.points[0].value,.3);
 assert.equal(engine.snapshot().pending,pending);assert.equal(engine.snapshot().localRevision,revision);
 engine.destroy();online=false;engine=make();await engine.init();
 const cached=await (await engine.transport(points)).json();assert.equal(cached.offlineCached,true);assert.equal(cached.points[0].value,.3);assert.ok(cached.cachedAt>0);
 online=true;value=.1;const fresh=await (await engine.transport(points)).json();assert.equal(fresh.points[0].value,.1);assert.equal(fresh.offlineCached,undefined);
 const before=calls;assert.equal((await engine.transport('/api/training',{method:'POST',body:'{}'})).status,503);assert.equal(calls,before);engine.destroy();
});
test('first offline use requests login or connection and never manufactures experiment data',async()=>{
 const engine=new OfflineEngine({read:async()=>null,write:async()=>{}},{get:async()=>'',set:async()=>{}},'https://example.com',()=>{},async()=>{throw Error('unexpected network');});
 await engine.init();const response=await engine.transport('/api/training');assert.equal(response.status,503);assert.match((await response.json()).error,/登录/);engine.destroy();
});
