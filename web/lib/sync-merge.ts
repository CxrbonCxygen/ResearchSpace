import {normalizeState,type State} from './model.ts';
const collections=['projects','experiments','cards','tasks','repeatRules','taskCategories'] as const;
export type Conflict={collection:string,id:string,field:string,local:unknown,remote:unknown,title:string};
export function same(a:unknown,b:unknown):boolean{if(a===b)return true;if(!a||!b||typeof a!=='object'||typeof b!=='object')return false;if(Array.isArray(a)||Array.isArray(b))return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>same(v,b[i]));const ak=Object.keys(a as object).sort(),bk=Object.keys(b as object).sort();return same(ak,bk)&&ak.every(k=>same((a as any)[k],(b as any)[k]));}
export function mergeStates(base:State,local:State,remote:State,prefer?:'local'|'remote'){
 const result=structuredClone(remote),conflicts:Conflict[]=[];
 for(const collection of collections){const b=new Map(base[collection].map(x=>[x.id,x])),l=new Map(local[collection].map(x=>[x.id,x])),r=new Map(remote[collection].map(x=>[x.id,x]));const merged:any[]=[];
  for(const id of new Set([...r.keys(),...l.keys(),...b.keys()])){const bv=b.get(id)??null,lv=l.get(id)??null,rv=r.get(id)??null;let value:any;
   if(same(lv,bv))value=rv;else if(same(rv,bv)||same(lv,rv))value=lv;
   else if(!lv||!rv||!bv){conflicts.push({collection,id,field:'整条记录',local:lv,remote:rv,title:(lv??rv??bv as any)?.title??(lv??rv??bv as any)?.name??id});value=prefer==='remote'?rv:lv;}
   else{value={...rv};for(const key of new Set([...Object.keys(bv),...Object.keys(lv),...Object.keys(rv)])){const a=(bv as any)[key],x=(lv as any)[key],y=(rv as any)[key];if(same(x,a))value[key]=y;else if(same(y,a)||same(x,y))value[key]=x;else{conflicts.push({collection,id,field:key,local:x??null,remote:y??null,title:(lv as any).title??(lv as any).name??id});value[key]=prefer==='remote'?y:x;}}}
   if(value)merged.push(value);
  }
  (result as any)[collection]=merged;
 }
 result.realProjectsVersion=Math.max(base.realProjectsVersion,local.realProjectsVersion,remote.realProjectsVersion);
 result.knowledgeVersion=Math.max(base.knowledgeVersion,local.knowledgeVersion,remote.knowledgeVersion);
 result.demo=local.demo===base.demo?remote.demo:local.demo;
 return {state:normalizeState(result),conflicts};
}
