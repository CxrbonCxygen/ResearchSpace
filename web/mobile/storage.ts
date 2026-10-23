import type {Persistence,RecordData,Vault} from './engine';
declare global{interface Window{ResearchSpaceAndroid?:{getToken:()=>string,setToken:(v:string)=>void,saveFile:(name:string,text:string,mime:string)=>void}}}
function open(){return new Promise<IDBDatabase>((resolve,reject)=>{const req=indexedDB.open('researchspace-offline-v1',1);req.onupgradeneeded=()=>req.result.createObjectStore('records');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
const db=open();
async function get<T>(key:string){const d=await db;return new Promise<T|undefined>((resolve,reject)=>{const req=d.transaction('records').objectStore('records').get(key);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function put(key:string,value:unknown){const d=await db;return new Promise<void>((resolve,reject)=>{const tx=d.transaction('records','readwrite');tx.objectStore('records').put(value,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
export const persistence:Persistence={read:async()=>await get<RecordData>('workspace')??null,write:async r=>{if(r.conflicts?.length)await put('conflict-backup',{at:Date.now(),local:r.local,base:r.base,remote:r.conflictRemote});await put('workspace',r);}};
export const vault:Vault={get:async()=>window.ResearchSpaceAndroid?.getToken()??await get<string>('dev-session')??'',set:async value=>{if(window.ResearchSpaceAndroid)window.ResearchSpaceAndroid.setToken(value);else await put('dev-session',value);}};
