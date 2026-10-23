import {installFoundationCards} from '../lib/foundation-cards.ts';
import {emptyState,normalizeState,addTaskCategory,retireTaskCategory,type State} from '../lib/model.ts';
import {mergeStates,same,type Conflict} from '../lib/sync-merge.ts';
export type RecordData={local:State,base:State,localRevision:number,cloudRevision:number,pending:boolean,username?:string,conflicts?:Conflict[],conflictRemote?:State,lastSynced?:number,trainingCache?:Record<string,{body:unknown,savedAt:number}>};
export type Persistence={read:()=>Promise<RecordData|null>,write:(r:RecordData)=>Promise<void>};
export type Vault={get:()=>Promise<string>,set:(v:string)=>Promise<void>};
export class OfflineEngine{
 private record!:RecordData;private queue:Promise<unknown>=Promise.resolve();private busy=false;private token='';private timer:ReturnType<typeof setTimeout>|undefined;
 status='本机已保存 · 未连接云端';needsLogin=false;
 private db:Persistence;private vault:Vault;private cloud:string;private changed:(data:boolean)=>void;private request:typeof fetch;
 constructor(db:Persistence,vault:Vault,cloud:string,changed:(data:boolean)=>void,request:typeof fetch=fetch){this.db=db;this.vault=vault;this.cloud=cloud;this.changed=changed;this.request=request;}
 async init(){this.record=await this.db.read()??{local:emptyState(),base:emptyState(),localRevision:0,cloudRevision:0,pending:false};this.record.local=normalizeState(this.record.local);this.record.base=normalizeState(this.record.base);if(installFoundationCards(this.record.local)){this.record.localRevision++;this.record.pending=true;await this.db.write(this.record);}this.token=await this.vault.get();this.updateStatus();}
 snapshot(){return structuredClone(this.record);}
 private updateStatus(message?:string){this.status=message??(this.needsLogin?'登录已过期 · 本机记录保留':this.record.conflicts?.length?'同步内容有冲突，请选择保留版本':this.token?(this.record.pending?'本机已保存 · 待同步':this.record.lastSynced?'已与云端同步':'本机已保存 · 待连接'):'本机已保存 · 未登录云端');this.changed(false);}
 private edit<T>(fn:(r:RecordData)=>T){const work=this.queue.then(async()=>{const next=structuredClone(this.record);const result=fn(next);await this.db.write(next);this.record=next;this.updateStatus();return result;});this.queue=work.catch(()=>{});return work;}
 private schedule(){clearTimeout(this.timer);this.timer=setTimeout(()=>void this.sync(),800);}
 async transport(url:string,options:RequestInit={}){await this.queue;const method=options.method??'GET';const json=(v:unknown,status=200)=>Response.json(v,{status});if(url==='/api/state'&&method==='GET')return json({state:this.record.local,revision:this.record.localRevision});
  if(url==='/api/state'&&method==='PUT'){const body=JSON.parse(String(options.body));const result=await this.edit(r=>{if(body.revision!==r.localRevision)return null;r.local=normalizeState(body.state);r.localRevision++;r.pending=true;r.conflicts=undefined;return r.localRevision;});if(result===null)return json({error:'本机记录已更新，请重试'},409);this.schedule();return json({revision:result});}
  if(url==='/api/categories'&&(method==='POST'||method==='DELETE')){const body=JSON.parse(String(options.body));const result=await this.edit(r=>{if(body.revision!==r.localRevision)return null;let moved=0;if(method==='POST')addTaskCategory(r.local,body.name);else moved=retireTaskCategory(r.local,body.id);r.localRevision++;r.pending=true;r.conflicts=undefined;return {state:r.local,revision:r.localRevision,moved};});if(!result)return json({error:'本机记录已更新，请重试'},409);this.schedule();return json(result);}
  if(method==='GET'&&/^\/api\/training(?:\?run=[a-zA-Z0-9._%-]{1,450})?$/.test(url)){
   if(this.token&&!this.needsLogin){try{
    const response=await this.cloudFetch(url);
    if(response.status===401){this.needsLogin=true;this.updateStatus('登录已过期 · 已缓存的实验仍可查看');}
    else if(response.ok){const body=await response.json();await this.edit(r=>{r.trainingCache??={};r.trainingCache[url]={body,savedAt:Date.now()};});return json(body);}
   }catch{}}
   const cached=this.record.trainingCache?.[url];
   if(cached)return json({...cached.body as object,offlineCached:true,cachedAt:cached.savedAt});
   return json({error:this.needsLogin||!this.token?'请先登录云端，再打开训练可视化同步实验':'未缓存此实验，请联网后打开一次'},503);
  }
  return json({error:'此功能请在联网的网页版中使用'},503);
 }
 private async network(url:string,options:RequestInit={}){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{return await this.request(url,{...options,signal:controller.signal});}finally{clearTimeout(timer);}}
 private async cloudFetch(path:string,options:RequestInit={}){return this.network(this.cloud+path,{...options,headers:{'Content-Type':'application/json',Authorization:'Bearer '+this.token,...options.headers},redirect:'error'});}
 async login(username:string,password:string){const response=await this.network(this.cloud+'/api/account/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password}),redirect:'error'});let data:any;try{data=await response.json();}catch{throw Error('云端登录尚未启用，请先在网页版设置独立账号');}if(!response.ok)throw Error(data.error??'登录失败');if(!/^[a-f0-9]{64}$/.test(data.token))throw Error('登录响应无效');this.token=data.token;this.needsLogin=false;await this.vault.set(this.token);await this.edit(r=>{r.username=data.username;});await this.sync();}
 async logout(){try{await this.cloudFetch('/api/account/logout',{method:'POST'});}catch{}this.token='';this.needsLogin=false;await this.vault.set('');await this.edit(r=>{r.username=undefined;});}
 async sync(){if(this.busy||!this.token)return;this.busy=true;this.updateStatus('正在同步…');try{for(let attempt=0;attempt<3;attempt++){const response=await this.cloudFetch('/api/state');if(response.status===401){this.needsLogin=true;this.updateStatus('登录已过期 · 本机记录保留，请重新登录');return;}if(!response.ok)throw Error('云端暂时不可用');const remote=await response.json() as any;remote.state=normalizeState(remote.state);await this.queue;const sent=this.snapshot(),merged=mergeStates(sent.base,sent.local,remote.state);if(merged.conflicts.length){await this.edit(r=>{r.conflicts=merged.conflicts;r.conflictRemote=remote.state;});return;}
    let revision=remote.revision;if(!same(merged.state,remote.state)){const save=await this.cloudFetch('/api/state',{method:'PUT',body:JSON.stringify({state:merged.state,revision})});if(save.status===409)continue;if(save.status===401){this.needsLogin=true;this.updateStatus('登录已过期 · 本机记录保留，请重新登录');return;}if(!save.ok)throw Error('云端保存暂时失败');const body=await save.json() as any;revision=body.revision;}
    await this.edit(r=>{const next=r.localRevision===sent.localRevision?{state:merged.state,conflicts:[]}:mergeStates(sent.local,r.local,merged.state);r.base=merged.state;r.cloudRevision=revision;r.local=next.state;r.localRevision++;r.pending=!same(r.local,r.base);r.lastSynced=Date.now();r.conflicts=next.conflicts.length?next.conflicts:undefined;r.conflictRemote=next.conflicts.length?merged.state:undefined;});this.changed(true);if(this.record.pending&&!this.record.conflicts?.length)this.schedule();return;
   }this.updateStatus('云端正在更新 · 稍后重试，本机记录已保存');}catch{this.updateStatus('离线可用 · 本机记录已保存，联网后同步');}finally{this.busy=false;}}
 async resolve(prefer:'local'|'remote'){await this.edit(r=>{if(!r.conflictRemote)return;const merged=mergeStates(r.base,r.local,r.conflictRemote,prefer);r.local=merged.state;r.base=r.conflictRemote;r.localRevision++;r.pending=true;r.conflicts=undefined;r.conflictRemote=undefined;});this.changed(true);await this.sync();}
 destroy(){clearTimeout(this.timer);}
}
